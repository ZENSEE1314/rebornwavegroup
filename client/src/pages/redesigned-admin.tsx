import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
  ShoppingCart,
  Gift,
  Calendar,
  Award,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Check,
  X,
  Edit,
  Plus,
  Search,
  Filter
} from "lucide-react";

function RedesignedAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Enable WebSocket for real-time updates
  useWebSocket(Boolean(user && (user as any).role === 'admin'));

  // State for various modals and forms
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedCashOut, setSelectedCashOut] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState("");

  // Check admin access
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

  // Fetch all admin data
  const { data: usersResponse }: any = useQuery({ queryKey: ['/api/admin/users'], retry: false });
  const { data: cashOutResponse }: any = useQuery({ queryKey: ['/api/admin/cash-outs'], retry: false });
  const { data: transactionsResponse }: any = useQuery({ queryKey: ['/api/admin/transactions'], retry: false });
  const { data: paymentVerificationsResponse }: any = useQuery({ queryKey: ['/api/admin/payment-verifications'], retry: false });
  const { data: commissionStats }: any = useQuery({ queryKey: ['/api/admin/commission-stats'], retry: false });
  const { data: topUpRequests }: any = useQuery({ queryKey: ['/api/admin/topup-requests'], retry: false });
  const { data: tokenClaims }: any = useQuery({ queryKey: ['/api/admin/token-claims'], retry: false });
  const { data: activatedPetsResponse }: any = useQuery({ queryKey: ['/api/admin/activated-pets'], retry: false });
  const { data: toysResponse }: any = useQuery({ queryKey: ['/api/admin/all-toys'], retry: false });
  const { data: appointmentsResponse }: any = useQuery({ queryKey: ['/api/admin/appointments'], retry: false });
  const { data: promotionBanners }: any = useQuery({ queryKey: ['/api/admin/banners'], retry: false });

  // Process overview data
  const totalUsers = usersResponse?.data?.length || 0;
  const totalCashOuts = cashOutResponse?.data?.length || 0;
  const pendingCashOuts = cashOutResponse?.data?.filter((co: any) => co.status === 'pending')?.length || 0;
  const totalTransactions = transactionsResponse?.data?.length || 0;
  const pendingVerifications = paymentVerificationsResponse?.data?.filter((pv: any) => pv.status === 'pending')?.length || 0;
  const pendingTopUps = topUpRequests?.filter((tu: any) => tu.status === 'pending')?.length || 0;
  const pendingTokenClaims = tokenClaims?.data?.filter((tc: any) => tc.status === 'pending')?.length || 0;
  const activePets = activatedPetsResponse?.data?.length || 0;
  const totalToys = toysResponse?.data?.length || 0;
  const totalAppointments = appointmentsResponse?.data?.length || 0;

  // Calculate financial metrics
  const totalRevenue = transactionsResponse?.data?.reduce((sum: number, t: any) => {
    return sum + (parseFloat(t.amount) || 0);
  }, 0) || 0;

  const monthlyRevenue = transactionsResponse?.data?.filter((t: any) => {
    const transactionDate = new Date(t.createdAt);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  })?.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0) || 0;

  const pendingCashOutAmount = cashOutResponse?.data?.filter((co: any) => co.status === 'pending')
    ?.reduce((sum: number, co: any) => sum + (parseFloat(co.amount) || 0), 0) || 0;

  // Mutations for admin actions
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes, pointsAwarded }: any) => {
      return await apiRequest(`/api/admin/payment-verifications/${id}`, 'PATCH', {
        status, adminNotes, pointsAwarded: pointsAwarded ? parseInt(pointsAwarded) : 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/commission-stats'] });
      toast({ title: "Success", description: "Payment verification updated successfully" });
      setSelectedPayment(null);
      setAdminNotes("");
      setPointsAwarded("");
    }
  });

  const updateCashOutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: any) => {
      return await apiRequest(`/api/admin/cash-outs/${id}`, 'PATCH', { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
      toast({ title: "Success", description: "Cash-out request updated successfully" });
      setSelectedCashOut(null);
      setAdminNotes("");
    }
  });

  const handlePaymentAction = (payment: any, action: 'approve' | 'reject') => {
    setSelectedPayment({ ...payment, action });
    setAdminNotes("");
    setPointsAwarded(action === 'approve' ? payment.amount || "" : "");
  };

  const handleCashOutAction = (cashOut: any, action: 'approve' | 'reject') => {
    setSelectedCashOut({ ...cashOut, action });
    setAdminNotes("");
  };

  const submitPaymentAction = () => {
    if (!selectedPayment) return;
    updatePaymentMutation.mutate({
      id: selectedPayment.id,
      status: selectedPayment.action === 'approve' ? 'approved' : 'rejected',
      adminNotes,
      pointsAwarded: selectedPayment.action === 'approve' ? pointsAwarded : 0
    });
  };

  const submitCashOutAction = () => {
    if (!selectedCashOut) return;
    updateCashOutMutation.mutate({
      id: selectedCashOut.id,
      status: selectedCashOut.action === 'approve' ? 'approved' : 'rejected',
      adminNotes
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default">{status}</Badge>;
      case 'rejected': return <Badge variant="destructive">{status}</Badge>;
      case 'pending': return <Badge variant="secondary">{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Platform overview and management center
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 bg-white dark:bg-slate-800 shadow-md rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="cashouts" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <DollarSign className="h-4 w-4" />
              Cash Outs
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Activity className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="toys" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              Toys
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Settings className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
                  <div className="flex items-center text-xs opacity-80 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Active platform members
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</div>
                  <div className="flex items-center text-xs opacity-80 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Current month earnings
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                  <Clock className="h-4 w-4 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pendingVerifications + pendingCashOuts + pendingTopUps + pendingTokenClaims}
                  </div>
                  <div className="flex items-center text-xs opacity-80 mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Require attention
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Pets</CardTitle>
                  <Gift className="h-4 w-4 opacity-80" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activePets.toLocaleString()}</div>
                  <div className="flex items-center text-xs opacity-80 mt-1">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    Pets in circulation
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Actions Summary */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Actions Required - Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("payments")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Payment Verifications</span>
                    </div>
                    <Badge variant={pendingVerifications > 0 ? "destructive" : "secondary"}>
                      {pendingVerifications} pending
                    </Badge>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("cashouts")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Cash Outs</span>
                    </div>
                    <Badge variant={pendingCashOuts > 0 ? "destructive" : "secondary"}>
                      {pendingCashOuts} pending
                    </Badge>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("content")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">Top-ups</span>
                    </div>
                    <Badge variant={pendingTopUps > 0 ? "destructive" : "secondary"}>
                      {pendingTopUps} pending
                    </Badge>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => setActiveTab("content")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold">Token Claims</span>
                    </div>
                    <Badge variant={pendingTokenClaims > 0 ? "destructive" : "secondary"}>
                      {pendingTokenClaims} pending
                    </Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-500" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</span>
                      <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</span>
                      <span className="font-semibold">{formatCurrency(monthlyRevenue)}</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Pending Cashouts</span>
                      <span className="font-semibold text-red-600">{formatCurrency(pendingCashOutAmount)}</span>
                    </div>
                    <Progress value={pendingCashOutAmount / Math.max(totalRevenue, 1) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Verifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentVerificationsResponse?.data?.length > 0 ? (
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
                      {paymentVerificationsResponse.data.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.userFirstName} {payment.userLastName}</p>
                              <p className="text-xs text-muted-foreground">{payment.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatMoney(payment.amount)}</TableCell>
                          <TableCell className="max-w-xs truncate">{payment.description}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {payment.receiptImageUrl && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Receipt Image</DialogTitle>
                                    </DialogHeader>
                                    <img src={payment.receiptImageUrl} alt="Receipt" className="max-w-full max-h-96 object-contain mx-auto" />
                                  </DialogContent>
                                </Dialog>
                              )}
                              {payment.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePaymentAction(payment, 'approve')}
                                    className="text-green-600"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePaymentAction(payment, 'reject')}
                                    className="text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payment Verifications</h3>
                    <p className="text-muted-foreground">No payment verifications have been submitted yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cash Out Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cashOutResponse?.data?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashOutResponse.data.map((cashOut: any) => (
                        <TableRow key={cashOut.id}>
                          <TableCell className="font-medium">{cashOut.userId}</TableCell>
                          <TableCell className="font-medium">{formatMoney(cashOut.amount)}</TableCell>
                          <TableCell>{cashOut.paymentMethod || 'Bank Transfer'}</TableCell>
                          <TableCell>{getStatusBadge(cashOut.status)}</TableCell>
                          <TableCell>{formatDate(cashOut.createdAt)}</TableCell>
                          <TableCell>
                            {cashOut.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCashOutAction(cashOut, 'approve')}
                                  className="text-green-600"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCashOutAction(cashOut, 'reject')}
                                  className="text-red-600"
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
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Cash Out Requests</h3>
                    <p className="text-muted-foreground">No cash out requests have been submitted yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersResponse?.data?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersResponse.data.slice(0, 10).map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-medium">{formatMoney(user.credits || 0)}</TableCell>
                          <TableCell className="font-medium">{user.loyaltyPoints || 0}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role || 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Users</h3>
                    <p className="text-muted-foreground">No users have registered yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsResponse?.data?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionsResponse.data.slice(0, 15).map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.userId}</TableCell>
                          <TableCell className="font-medium">{formatMoney(transaction.amount)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transaction.type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="text-muted-foreground">No transactions have been recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Additional tabs for toys, content, and appointments would follow similar patterns */}
          <TabsContent value="toys" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Toy Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Total Toys: {totalToys}</h3>
                  <p className="text-muted-foreground">Toy management features will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Content Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Content & Settings</h3>
                  <p className="text-muted-foreground">Banner and content management features will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Total Appointments: {totalAppointments}</h3>
                  <p className="text-muted-foreground">Appointment management features will be displayed here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Action Dialog */}
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedPayment?.action === 'approve' ? 'Approve' : 'Reject'} Payment Verification
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPayment && (
                <div className="space-y-2">
                  <p><strong>User:</strong> {selectedPayment.userFirstName} {selectedPayment.userLastName}</p>
                  <p><strong>Amount:</strong> {formatMoney(selectedPayment.amount)}</p>
                  <p><strong>Description:</strong> {selectedPayment.description}</p>
                </div>
              )}
              
              {selectedPayment?.action === 'approve' && (
                <div className="space-y-2">
                  <Label htmlFor="pointsAwarded">Points to Award</Label>
                  <Input
                    id="pointsAwarded"
                    type="number"
                    value={pointsAwarded}
                    onChange={(e) => setPointsAwarded(e.target.value)}
                    placeholder="Enter points to award"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitPaymentAction}
                  disabled={updatePaymentMutation.isPending}
                  variant={selectedPayment?.action === 'approve' ? 'default' : 'destructive'}
                >
                  {updatePaymentMutation.isPending ? 'Processing...' : 
                   selectedPayment?.action === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cash Out Action Dialog */}
        <Dialog open={!!selectedCashOut} onOpenChange={() => setSelectedCashOut(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCashOut?.action === 'approve' ? 'Approve' : 'Reject'} Cash Out Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCashOut && (
                <div className="space-y-2">
                  <p><strong>User ID:</strong> {selectedCashOut.userId}</p>
                  <p><strong>Amount:</strong> {formatMoney(selectedCashOut.amount)}</p>
                  <p><strong>Method:</strong> {selectedCashOut.paymentMethod || 'Bank Transfer'}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="cashOutNotes">Admin Notes</Label>
                <Textarea
                  id="cashOutNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedCashOut(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitCashOutAction}
                  disabled={updateCashOutMutation.isPending}
                  variant={selectedCashOut?.action === 'approve' ? 'default' : 'destructive'}
                >
                  {updateCashOutMutation.isPending ? 'Processing...' : 
                   selectedCashOut?.action === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default RedesignedAdmin;