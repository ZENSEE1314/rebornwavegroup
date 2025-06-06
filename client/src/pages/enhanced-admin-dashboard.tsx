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
  Trophy,
  LogOut,
  ArrowUp,
  TrendingDown,
  Clock,
  Camera,
  Star,
  AlertTriangle
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalAppointments: number;
  activePets: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

interface Transaction {
  id: number;
  type: string;
  description: string;
  userId: string;
  amount: string;
  status: string;
  createdAt: Date | null;
  referenceId: string | null;
  pointsEarned: number | null;
}

interface TopUpRequest {
  id: number;
  userId: string;
  amount: string;
  bankCode: string;
  accountNumber: string;
  status: string;
  createdAt: Date;
  adminNotes?: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

interface Appointment {
  id: number;
  userId: string;
  service: string;
  date: Date;
  time: string;
  status: string;
  notes?: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export default function EnhancedAdminDashboard() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Top-up states
  const [topUpCurrentPage, setTopUpCurrentPage] = useState(1);
  const [topUpItemsPerPage] = useState(10);
  const [adminNotes, setAdminNotes] = useState("");
  
  // Appointment states
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentCurrentPage, setAppointmentCurrentPage] = useState(1);
  const [appointmentItemsPerPage] = useState(10);
  
  // Pet management states
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [petSearch, setPetSearch] = useState("");
  
  // Analytics states
  const [dateRange, setDateRange] = useState("7d");
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Fetch dashboard stats
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch transactions
  const { data: transactionsResponse } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });
  const transactions = transactionsResponse?.data || [];

  // Fetch top-up requests
  const { data: topUpRequests = [] } = useQuery<TopUpRequest[]>({
    queryKey: ["/api/admin/topup-requests"],
  });

  // Fetch appointments
  const { data: appointmentsResponse } = useQuery({
    queryKey: ["/api/admin/appointments"],
  });
  const appointments = appointmentsResponse?.data || [];

  // Fetch pets
  const { data: pets = [] } = useQuery({
    queryKey: ["/api/admin/pets"],
  });
  const petsArray = Array.isArray(pets) ? pets : [];

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/admin/analytics", dateRange],
  });

  // Mutations
  const updateTopUpMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest("PATCH", `/api/admin/topup-requests/${id}`, {
        status,
        adminNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/topup-requests"] });
      toast({
        title: "Success",
        description: "Top-up request updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update top-up request",
        variant: "destructive",
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/admin/appointments/${id}`, {
        status,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Filtered data
  const filteredTransactions = transactions.filter((transaction: Transaction) =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.userId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAppointments = Array.isArray(appointments) ? appointments.filter((appointment: Appointment) =>
    appointment.service?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
    (appointment.user?.firstName && appointment.user.firstName.toLowerCase().includes(appointmentSearch.toLowerCase())) ||
    (appointment.user?.email && appointment.user.email.toLowerCase().includes(appointmentSearch.toLowerCase()))
  ) : [];

  const filteredPets = petsArray.filter((pet: any) =>
    pet.name?.toLowerCase().includes(petSearch.toLowerCase()) ||
    (pet.user?.firstName && pet.user.firstName.toLowerCase().includes(petSearch.toLowerCase()))
  );

  // Download CSV function
  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]).join(',');
    const csvContent = [
      headers,
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination logic
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const paginatedTopUps = topUpRequests.slice(
    (topUpCurrentPage - 1) * topUpItemsPerPage,
    topUpCurrentPage * topUpItemsPerPage
  );

  const paginatedAppointments = filteredAppointments.slice(
    (appointmentCurrentPage - 1) * appointmentItemsPerPage,
    appointmentCurrentPage * appointmentItemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-300">Manage your Reborn Wave Group platform</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => downloadCSV(transactions, 'all-transactions')}
              variant="outline"
              className="bg-white/10 text-white border-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button
              onClick={() => window.location.href = '/api/logout'}
              variant="outline"
              className="bg-white/10 text-white border-white/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(stats?.totalUsers || 0)}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">RP {formatMoney(stats?.totalRevenue || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Total Appointments</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(stats?.totalAppointments || 0)}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Active Pets</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(stats?.activePets || 0)}</p>
                </div>
                <Heart className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">Transactions</TabsTrigger>
            <TabsTrigger value="topups" className="data-[state=active]:bg-white/20">Top-ups</TabsTrigger>
            <TabsTrigger value="appointments" className="data-[state=active]:bg-white/20">Appointments</TabsTrigger>
            <TabsTrigger value="pets" className="data-[state=active]:bg-white/20">Pets</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction: Transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-gray-300 text-sm">User: {transaction.userId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">RP {formatMoney(transaction.amount)}</p>
                          <Badge className={transaction.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={() => setActiveTab("transactions")}
                      className="bg-blue-600 hover:bg-blue-700 h-16"
                    >
                      <FileText className="h-6 w-6 mr-2" />
                      View Transactions
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("topups")}
                      className="bg-green-600 hover:bg-green-700 h-16"
                    >
                      <CreditCard className="h-6 w-6 mr-2" />
                      Manage Top-ups
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("appointments")}
                      className="bg-purple-600 hover:bg-purple-700 h-16"
                    >
                      <Calendar className="h-6 w-6 mr-2" />
                      View Appointments
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("pets")}
                      className="bg-pink-600 hover:bg-pink-700 h-16"
                    >
                      <Heart className="h-6 w-6 mr-2" />
                      Manage Pets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Transaction Management</CardTitle>
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      />
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
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white">Type</TableHead>
                        <TableHead className="text-white">Description</TableHead>
                        <TableHead className="text-white">User ID</TableHead>
                        <TableHead className="text-white">Amount</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Date</TableHead>
                        <TableHead className="text-white">Points Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((transaction: Transaction) => (
                        <TableRow key={transaction.id} className="border-white/20">
                          <TableCell className="text-gray-300">{transaction.type}</TableCell>
                          <TableCell className="text-gray-300">{transaction.description}</TableCell>
                          <TableCell className="text-gray-300">{transaction.userId}</TableCell>
                          <TableCell className="text-green-300">RP {formatMoney(transaction.amount)}</TableCell>
                          <TableCell>
                            <Badge className={transaction.status === 'completed' ? 'bg-green-500' : 
                                             transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-blue-300">
                            {transaction.pointsEarned ? `${transaction.pointsEarned} pts` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top-ups Tab */}
          <TabsContent value="topups">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Top-up Requests</CardTitle>
                  <Button 
                    onClick={() => downloadCSV(topUpRequests, 'topup-requests')}
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white">User</TableHead>
                        <TableHead className="text-white">Amount</TableHead>
                        <TableHead className="text-white">Bank</TableHead>
                        <TableHead className="text-white">Account</TableHead>
                        <TableHead className="text-white">Date</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTopUps.map((request: TopUpRequest) => (
                        <TableRow key={request.id} className="border-white/20">
                          <TableCell className="text-gray-300">
                            {request.user?.firstName || 'N/A'} {request.user?.lastName || ''}
                          </TableCell>
                          <TableCell className="text-green-300">RP {formatMoney(request.amount)}</TableCell>
                          <TableCell className="text-gray-300">{request.bankCode}</TableCell>
                          <TableCell className="text-gray-300">{request.accountNumber}</TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={request.status === 'approved' ? 'bg-green-500' : 
                                             request.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateTopUpMutation.mutate({ 
                                  id: request.id, 
                                  status: 'approved',
                                  adminNotes 
                                })}
                                disabled={updateTopUpMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500 text-red-400 hover:bg-red-500"
                                onClick={() => updateTopUpMutation.mutate({ 
                                  id: request.id, 
                                  status: 'rejected',
                                  adminNotes 
                                })}
                                disabled={updateTopUpMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search appointments..."
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                      />
                    </div>
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white">User</TableHead>
                        <TableHead className="text-white">Service</TableHead>
                        <TableHead className="text-white">Date</TableHead>
                        <TableHead className="text-white">Time</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-white">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAppointments.map((appointment: Appointment) => (
                        <TableRow key={appointment.id} className="border-white/20">
                          <TableCell className="text-gray-300">
                            {appointment.user?.firstName || 'N/A'} {appointment.user?.lastName || ''}
                          </TableCell>
                          <TableCell className="text-gray-300">{appointment.service}</TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(appointment.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-300">{appointment.time}</TableCell>
                          <TableCell>
                            <Badge className={appointment.status === 'confirmed' ? 'bg-green-500' : 
                                             appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'}>
                              {appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'confirmed' 
                                })}
                                disabled={updateAppointmentMutation.isPending}
                              >
                                Confirm
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500 text-red-400 hover:bg-red-500"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'cancelled' 
                                })}
                                disabled={updateAppointmentMutation.isPending}
                              >
                                Cancel
                              </Button>
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

          {/* Pets Tab */}
          <TabsContent value="pets">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Pet Management</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search pets..."
                      value={petSearch}
                      onChange={(e) => setPetSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPets.map((pet: any) => (
                    <Card key={pet.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                            {pet.species === 'dragon' ? '🐉' : pet.species === 'cat' ? '🐱' : '🐶'}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold">{pet.name}</h3>
                            <p className="text-gray-300 text-sm">Level {pet.level}</p>
                            <p className="text-gray-300 text-sm">Owner: {pet.user?.firstName || 'Unknown'}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Health</span>
                            <span className="text-green-400">{pet.health}/100</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Energy</span>
                            <span className="text-blue-400">{pet.energy}/100</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">Cleanliness</span>
                            <span className="text-purple-400">{pet.cleanliness}/100</span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 border-white/20 text-white">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 border-white/20 text-white">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}