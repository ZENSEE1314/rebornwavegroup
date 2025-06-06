import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar,
  Heart,
  Settings,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Gift,
  Star,
  Ban,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  UserCheck,
  UserX,
  Building,
  Banknote,
  Trophy,
  Gamepad2
} from "lucide-react";

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  credits: string;
  loyaltyPoints: number;
  lifetimePoints: number;
  referralEarnings: string;
  createdAt: Date | null;
  lastActive: Date | null;
}

interface PaymentVerification {
  id: number;
  userId: string;
  amount: string;
  description: string;
  receiptImageUrl: string | null;
  status: string;
  adminId: string | null;
  adminNotes: string | null;
  pointsAwarded: number | null;
  processedAt: Date | null;
  createdAt: Date | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface CashOut {
  id: number;
  userId: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  status: string;
  adminId: string | null;
  adminNotes: string | null;
  processedAt: Date | null;
  createdAt: Date | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface TopUpRequest {
  id: number;
  userId: string;
  amount: string;
  paymentMethod: string;
  status: string;
  adminNotes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

interface TokenTransaction {
  id: number;
  userId: string;
  tokens: number;
  type: string;
  description: string;
  relatedId: number | null;
  status: string;
  createdAt: Date | null;
}

interface Toy {
  id: number;
  name: string;
  category: string;
  rarity: string;
  imageUrl: string | null;
  pointsCost: number;
  isAvailable: boolean;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
}

interface Banner {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  isActive: boolean;
  priority: number;
  createdAt: Date | null;
}

export default function ComprehensiveAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerms, setSearchTerms] = useState({
    users: "",
    verifications: "",
    cashouts: "",
    topups: "",
    tokens: "",
    toys: "",
    banners: ""
  });
  const [selectedVerification, setSelectedVerification] = useState<PaymentVerification | null>(null);
  const [selectedCashOut, setSelectedCashOut] = useState<CashOut | null>(null);
  const [selectedTopUp, setSelectedTopUp] = useState<TopUpRequest | null>(null);
  const [verificationAction, setVerificationAction] = useState<{ id: number; action: string; notes: string } | null>(null);
  const [cashOutAction, setCashOutAction] = useState<{ id: number; action: string; notes: string } | null>(null);
  const [topUpAction, setTopUpAction] = useState<{ id: number; action: string; notes: string } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/admin/analytics"],
  });

  // Fetch users
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/admin/users"],
  });
  const users = usersResponse?.data || [];

  // Fetch payment verifications
  const { data: verificationsResponse } = useQuery({
    queryKey: ["/api/admin/payment-verifications"],
  });
  const verifications = verificationsResponse?.data || [];

  // Fetch cash-outs
  const { data: cashOutsResponse } = useQuery({
    queryKey: ["/api/admin/cash-outs"],
  });
  const cashOuts = cashOutsResponse?.data || [];

  // Fetch top-up requests
  const { data: topUpRequests = [] } = useQuery({
    queryKey: ["/api/admin/topup-requests"],
  });

  // Fetch token transactions
  const { data: tokenTransactionsResponse } = useQuery({
    queryKey: ["/api/admin/token-transactions"],
  });
  const tokenTransactions = tokenTransactionsResponse?.data || [];

  // Fetch toys
  const { data: toysResponse } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });
  const toys = toysResponse?.data || [];

  // Fetch banners
  const { data: banners = [] } = useQuery({
    queryKey: ["/api/admin/banners"],
  });

  // Process verification mutation
  const processVerificationMutation = useMutation({
    mutationFn: async ({ id, action, notes, pointsAwarded }: { id: number; action: string; notes: string; pointsAwarded?: number }) => {
      return apiRequest("PATCH", `/api/admin/payment-verifications/${id}`, {
        status: action,
        adminNotes: notes,
        pointsAwarded: pointsAwarded || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-verifications"] });
      toast({ title: "Payment verification updated successfully" });
      setVerificationAction(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update verification", description: error.message, variant: "destructive" });
    }
  });

  // Process cash-out mutation
  const processCashOutMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: string; notes: string }) => {
      return apiRequest("PATCH", `/api/admin/cash-outs/${id}`, {
        status: action,
        adminNotes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-outs"] });
      toast({ title: "Cash-out updated successfully" });
      setCashOutAction(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update cash-out", description: error.message, variant: "destructive" });
    }
  });

  // Process top-up mutation
  const processTopUpMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: string; notes: string }) => {
      return apiRequest("PUT", `/api/admin/topup-requests/${id}/status`, {
        status: action,
        adminNotes: notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topup-requests"] });
      toast({ title: "Top-up request updated successfully" });
      setTopUpAction(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update top-up request", description: error.message, variant: "destructive" });
    }
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update user role", description: error.message, variant: "destructive" });
    }
  });

  // Reset game scores mutation
  const resetGameScoresMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/admin/game-scores/reset");
    },
    onSuccess: () => {
      toast({ title: "Game scores reset successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to reset game scores", description: error.message, variant: "destructive" });
    }
  });

  // Filter functions
  const filteredUsers = users.filter((user: User) =>
    user.firstName?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerms.users.toLowerCase()) ||
    user.id.includes(searchTerms.users)
  );

  const filteredVerifications = verifications.filter((verification: PaymentVerification) =>
    verification.userEmail?.toLowerCase().includes(searchTerms.verifications.toLowerCase()) ||
    verification.description?.toLowerCase().includes(searchTerms.verifications.toLowerCase()) ||
    verification.status?.toLowerCase().includes(searchTerms.verifications.toLowerCase())
  );

  const filteredCashOuts = Array.isArray(cashOuts) ? cashOuts.filter((cashOut: CashOut) =>
    cashOut.userEmail?.toLowerCase().includes(searchTerms.cashouts.toLowerCase()) ||
    cashOut.bankName?.toLowerCase().includes(searchTerms.cashouts.toLowerCase()) ||
    cashOut.status?.toLowerCase().includes(searchTerms.cashouts.toLowerCase())
  ) : [];

  const filteredTopUps = Array.isArray(topUpRequests) ? topUpRequests.filter((topUp: TopUpRequest) =>
    topUp.user?.email?.toLowerCase().includes(searchTerms.topups.toLowerCase()) ||
    topUp.paymentMethod?.toLowerCase().includes(searchTerms.topups.toLowerCase()) ||
    topUp.status?.toLowerCase().includes(searchTerms.topups.toLowerCase())
  ) : [];

  const filteredTokenTransactions = Array.isArray(tokenTransactions) ? tokenTransactions.filter((transaction: TokenTransaction) =>
    transaction.userId.includes(searchTerms.tokens) ||
    transaction.description?.toLowerCase().includes(searchTerms.tokens.toLowerCase()) ||
    transaction.type?.toLowerCase().includes(searchTerms.tokens.toLowerCase())
  ) : [];

  const filteredToys = Array.isArray(toys) ? toys.filter((toy: Toy) =>
    toy.name?.toLowerCase().includes(searchTerms.toys.toLowerCase()) ||
    toy.category?.toLowerCase().includes(searchTerms.toys.toLowerCase()) ||
    toy.rarity?.toLowerCase().includes(searchTerms.toys.toLowerCase())
  ) : [];

  const filteredBanners = Array.isArray(banners) ? banners.filter((banner: Banner) =>
    banner.title?.toLowerCase().includes(searchTerms.banners.toLowerCase()) ||
    banner.description?.toLowerCase().includes(searchTerms.banners.toLowerCase())
  ) : [];

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'confirmed':
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Comprehensive platform management</p>
          </div>
          <Button
            onClick={() => resetGameScoresMutation.mutate()}
            disabled={resetGameScoresMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Leaderboard
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="verifications" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="cashouts" className="gap-2">
              <Banknote className="h-4 w-4" />
              Cash-outs
            </TabsTrigger>
            <TabsTrigger value="topups" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Top-ups
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-2">
              <Trophy className="h-4 w-4" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="toys" className="gap-2">
              <Gift className="h-4 w-4" />
              Toys
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Banners
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">Registered platform users</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingVerifications || 0}</div>
                  <p className="text-xs text-muted-foreground">Need admin review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Pets</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activePets || 0}</div>
                  <p className="text-xs text-muted-foreground">Virtual pets in system</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground">Platform earnings</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => setActiveTab("verifications")} 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                >
                  <CheckCircle className="h-6 w-6" />
                  Review Payments
                </Button>
                <Button 
                  onClick={() => setActiveTab("cashouts")} 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                >
                  <Banknote className="h-6 w-6" />
                  Process Cash-outs
                </Button>
                <Button 
                  onClick={() => setActiveTab("users")} 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                >
                  <Users className="h-6 w-6" />
                  Manage Users
                </Button>
                <Button 
                  onClick={() => resetGameScoresMutation.mutate()}
                  disabled={resetGameScoresMutation.isPending}
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                >
                  <Gamepad2 className="h-6 w-6" />
                  Reset Scores
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, or ID..."
                  value={searchTerms.users}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, users: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Loyalty Points</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(user.credits)}</TableCell>
                        <TableCell>{user.loyaltyPoints}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Verifications Tab */}
          <TabsContent value="verifications" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search verifications..."
                  value={searchTerms.verifications}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, verifications: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Verifications</CardTitle>
                <CardDescription>Review and process payment verification requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVerifications.map((verification: PaymentVerification) => (
                      <TableRow key={verification.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{verification.userFirstName} {verification.userLastName}</div>
                            <div className="text-sm text-gray-500">{verification.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(verification.amount)}</TableCell>
                        <TableCell>{verification.description}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(verification.status)}>
                            {verification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(verification.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedVerification(verification)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Payment Verification Details</DialogTitle>
                                </DialogHeader>
                                {selectedVerification && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>User</Label>
                                        <p>{selectedVerification.userFirstName} {selectedVerification.userLastName}</p>
                                        <p className="text-sm text-gray-500">{selectedVerification.userEmail}</p>
                                      </div>
                                      <div>
                                        <Label>Amount</Label>
                                        <p>{formatCurrency(selectedVerification.amount)}</p>
                                      </div>
                                      <div>
                                        <Label>Status</Label>
                                        <Badge variant={getStatusVariant(selectedVerification.status)}>
                                          {selectedVerification.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label>Date</Label>
                                        <p>{formatDate(selectedVerification.createdAt)}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Description</Label>
                                      <p>{selectedVerification.description}</p>
                                    </div>
                                    {selectedVerification.receiptImageUrl && (
                                      <div>
                                        <Label>Receipt</Label>
                                        <img 
                                          src={selectedVerification.receiptImageUrl} 
                                          alt="Payment receipt" 
                                          className="max-w-full h-auto border rounded"
                                        />
                                      </div>
                                    )}
                                    {selectedVerification.status === 'pending' && (
                                      <div className="flex gap-2 pt-4">
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button 
                                              onClick={() => setVerificationAction({
                                                id: selectedVerification.id,
                                                action: 'approved',
                                                notes: ''
                                              })}
                                              className="gap-2"
                                            >
                                              <CheckCircle className="h-4 w-4" />
                                              Approve
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>Approve Payment</DialogTitle>
                                              <DialogDescription>
                                                Confirm payment approval and award points
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                              <div>
                                                <Label>Points to Award</Label>
                                                <Input 
                                                  type="number" 
                                                  placeholder="Enter points to award"
                                                  defaultValue={Math.floor(parseFloat(selectedVerification.amount) / 1000)}
                                                />
                                              </div>
                                              <div>
                                                <Label>Admin Notes</Label>
                                                <Textarea 
                                                  placeholder="Add any notes..."
                                                  value={verificationAction?.notes || ''}
                                                  onChange={(e) => setVerificationAction(prev => 
                                                    prev ? { ...prev, notes: e.target.value } : null
                                                  )}
                                                />
                                              </div>
                                              <Button 
                                                onClick={() => {
                                                  if (verificationAction) {
                                                    processVerificationMutation.mutate({
                                                      ...verificationAction,
                                                      pointsAwarded: Math.floor(parseFloat(selectedVerification.amount) / 1000)
                                                    });
                                                  }
                                                }}
                                                disabled={processVerificationMutation.isPending}
                                                className="w-full"
                                              >
                                                Confirm Approval
                                              </Button>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                        <Button 
                                          variant="destructive"
                                          onClick={() => {
                                            setVerificationAction({
                                              id: selectedVerification.id,
                                              action: 'rejected',
                                              notes: ''
                                            });
                                            processVerificationMutation.mutate({
                                              id: selectedVerification.id,
                                              action: 'rejected',
                                              notes: 'Payment rejected by admin'
                                            });
                                          }}
                                          className="gap-2"
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash-outs Tab */}
          <TabsContent value="cashouts" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search cash-outs..."
                  value={searchTerms.cashouts}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, cashouts: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cash-out Requests</CardTitle>
                <CardDescription>Process user withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCashOuts.map((cashOut: CashOut) => (
                      <TableRow key={cashOut.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cashOut.userFirstName} {cashOut.userLastName}</div>
                            <div className="text-sm text-gray-500">{cashOut.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(cashOut.amount)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cashOut.bankName}</div>
                            <div className="text-sm text-gray-500">{cashOut.accountNumber}</div>
                            <div className="text-sm text-gray-500">{cashOut.accountHolderName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(cashOut.status)}>
                            {cashOut.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(cashOut.createdAt)}</TableCell>
                        <TableCell>
                          {cashOut.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => {
                                  processCashOutMutation.mutate({
                                    id: cashOut.id,
                                    action: 'approved',
                                    notes: 'Cash-out approved by admin'
                                  });
                                }}
                                className="gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  processCashOutMutation.mutate({
                                    id: cashOut.id,
                                    action: 'rejected',
                                    notes: 'Cash-out rejected by admin'
                                  });
                                }}
                                className="gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
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

          {/* Top-ups Tab */}
          <TabsContent value="topups" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search top-ups..."
                  value={searchTerms.topups}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, topups: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top-up Requests</CardTitle>
                <CardDescription>Process user credit top-up requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTopUps.map((topUp: TopUpRequest) => (
                      <TableRow key={topUp.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{topUp.user?.firstName} {topUp.user?.lastName}</div>
                            <div className="text-sm text-gray-500">{topUp.user?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(topUp.amount)}</TableCell>
                        <TableCell>{topUp.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(topUp.status)}>
                            {topUp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(topUp.createdAt)}</TableCell>
                        <TableCell>
                          {topUp.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => {
                                  processTopUpMutation.mutate({
                                    id: topUp.id,
                                    action: 'approved',
                                    notes: 'Top-up approved by admin'
                                  });
                                }}
                                className="gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  processTopUpMutation.mutate({
                                    id: topUp.id,
                                    action: 'rejected',
                                    notes: 'Top-up rejected by admin'
                                  });
                                }}
                                className="gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
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

          {/* Token Transactions Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search token transactions..."
                  value={searchTerms.tokens}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, tokens: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Token Transactions</CardTitle>
                <CardDescription>View all token-related transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokenTransactions.map((transaction: TokenTransaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.userId}</TableCell>
                        <TableCell className={transaction.tokens > 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.tokens > 0 ? '+' : ''}{transaction.tokens}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'earned' ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toys Tab */}
          <TabsContent value="toys" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search toys..."
                  value={searchTerms.toys}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, toys: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Toy Management</CardTitle>
                <CardDescription>Manage virtual toys and collectibles</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Toy</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rarity</TableHead>
                      <TableHead>Points Cost</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredToys.map((toy: Toy) => (
                      <TableRow key={toy.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {toy.imageUrl && (
                              <img src={toy.imageUrl} alt={toy.name} className="w-10 h-10 rounded" />
                            )}
                            <div>
                              <div className="font-medium">{toy.name}</div>
                              <div className="text-sm text-gray-500">ID: {toy.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{toy.category}</TableCell>
                        <TableCell>
                          <Badge variant={toy.rarity === 'legendary' ? 'default' : 'secondary'}>
                            {toy.rarity}
                          </Badge>
                        </TableCell>
                        <TableCell>{toy.pointsCost} points</TableCell>
                        <TableCell>
                          {toy.ownerId ? (
                            <div>
                              <div className="font-medium">{toy.ownerName}</div>
                              <div className="text-sm text-gray-500">{toy.ownerEmail}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Available</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={toy.isAvailable ? 'default' : 'secondary'}>
                            {toy.isAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banners Tab */}
          <TabsContent value="banners" className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search banners..."
                  value={searchTerms.banners}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, banners: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Banner Management</CardTitle>
                <CardDescription>Manage promotional banners and announcements</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banner</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBanners.map((banner: Banner) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {banner.imageUrl && (
                              <img src={banner.imageUrl} alt={banner.title} className="w-12 h-8 rounded object-cover" />
                            )}
                            <div>
                              <div className="font-medium">{banner.title}</div>
                              {banner.buttonText && (
                                <div className="text-sm text-gray-500">{banner.buttonText}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{banner.description}</TableCell>
                        <TableCell>{banner.priority}</TableCell>
                        <TableCell>
                          <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(banner.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
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