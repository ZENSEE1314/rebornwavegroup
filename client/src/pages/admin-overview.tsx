import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { formatMoney, formatCurrency, formatDate } from "@/lib/utils";
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
  Settings
} from "lucide-react";

// Import specific admin components
import PaymentVerificationTab from "@/components/admin/PaymentVerificationTab";
import CashOutManagementTab from "@/components/admin/CashOutManagementTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import TransactionMonitoringTab from "@/components/admin/TransactionMonitoringTab";
import ToyManagementTab from "@/components/admin/ToyManagementTab";
import ContentManagementTab from "@/components/admin/ContentManagementTab";
import AppointmentManagementTab from "@/components/admin/AppointmentManagementTab";
import SystemSettingsTab from "@/components/admin/SystemSettingsTab";

function AdminOverview() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Enable WebSocket for real-time updates only for admin users
  useWebSocket(Boolean(user && (user as any).role === 'admin'));

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

  // Fetch overview data
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: cashOutResponse } = useQuery({
    queryKey: ['/api/admin/cash-outs'],
    retry: false,
  });

  const { data: transactionsResponse } = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: false,
  });

  const { data: paymentVerificationsResponse } = useQuery({
    queryKey: [`/api/admin/payment-verifications`],
    retry: false,
  });

  const { data: commissionStats } = useQuery({
    queryKey: ['/api/admin/commission-stats'],
    retry: false,
  });

  const { data: topUpRequests } = useQuery({
    queryKey: ['/api/admin/topup-requests'],
    retry: false,
  });

  const { data: tokenClaims } = useQuery({
    queryKey: ['/api/admin/token-claims'],
    retry: false,
  });

  const { data: activatedPetsResponse } = useQuery({
    queryKey: ['/api/admin/activated-pets'],
    retry: false,
  });

  // Process data for overview cards
  const totalUsers = usersResponse?.data?.length || 0;
  const totalCashOuts = cashOutResponse?.data?.length || 0;
  const pendingCashOuts = cashOutResponse?.data?.filter((co: any) => co.status === 'pending')?.length || 0;
  const totalTransactions = transactionsResponse?.data?.length || 0;
  const pendingVerifications = paymentVerificationsResponse?.data?.filter((pv: any) => pv.status === 'pending')?.length || 0;
  const pendingTopUps = topUpRequests?.filter((tu: any) => tu.status === 'pending')?.length || 0;
  const pendingTokenClaims = tokenClaims?.data?.filter((tc: any) => tc.status === 'pending')?.length || 0;
  const activePets = activatedPetsResponse?.data?.length || 0;

  // Calculate revenue metrics
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

  // Recent activity
  const recentTransactions = transactionsResponse?.data?.slice(0, 5) || [];
  const recentCashOuts = cashOutResponse?.data?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome back, {(user as any).firstName || 'Admin'}. Here's your platform overview.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 bg-white dark:bg-slate-800 shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="cashouts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cash Outs
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="toys" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Toys
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Overview */}
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

            {/* Pending Items Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    Pending Actions Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-red-500" />
                      <span>Payment Verifications</span>
                    </div>
                    <Badge variant={pendingVerifications > 0 ? "destructive" : "secondary"}>
                      {pendingVerifications}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-yellow-500" />
                      <span>Cash Out Requests</span>
                    </div>
                    <Badge variant={pendingCashOuts > 0 ? "destructive" : "secondary"}>
                      {pendingCashOuts}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      <span>Top-up Requests</span>
                    </div>
                    <Badge variant={pendingTopUps > 0 ? "destructive" : "secondary"}>
                      {pendingTopUps}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-purple-500" />
                      <span>Token Claims</span>
                    </div>
                    <Badge variant={pendingTokenClaims > 0 ? "destructive" : "secondary"}>
                      {pendingTokenClaims}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-green-500" />
                    Financial Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Progress value={pendingCashOutAmount / totalRevenue * 100} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Commission Stats</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {commissionStats?.totalCommission || 0} total
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTransactions.length > 0 ? recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(transaction.amount)}</p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 text-center py-4">No recent transactions</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Recent Cash Outs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCashOuts.length > 0 ? recentCashOuts.map((cashOut: any) => (
                      <div key={cashOut.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Cash Out Request</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(cashOut.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(cashOut.amount)}</p>
                          <Badge 
                            variant={
                              cashOut.status === 'approved' ? 'default' : 
                              cashOut.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {cashOut.status}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <p className="text-slate-500 text-center py-4">No recent cash outs</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentVerificationTab />
          </TabsContent>

          <TabsContent value="cashouts">
            <CashOutManagementTab />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionMonitoringTab />
          </TabsContent>

          <TabsContent value="toys">
            <ToyManagementTab />
          </TabsContent>

          <TabsContent value="content">
            <ContentManagementTab />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminOverview;