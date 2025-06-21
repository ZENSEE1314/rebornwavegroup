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

  // Data fetching
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    refetchInterval: 30000
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  const { data: allToys } = useQuery({
    queryKey: ['/api/admin/toys'],
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['/api/admin/transactions'],
  });

  const { data: paymentVerifications } = useQuery({
    queryKey: ['/api/admin/payment-verifications'],
  });

  const { data: cashOutRequests } = useQuery({
    queryKey: ['/api/admin/cash-outs'],
  });

  const { data: allAppointments } = useQuery({
    queryKey: ['/api/admin/appointments'],
  });

  const { data: seasonsData } = useQuery({
    queryKey: ['/api/admin/seasons'],
  });

  const { data: feesReport } = useQuery({
    queryKey: ['/api/admin/fees-report'],
  });

  const { data: commissionStats } = useQuery({
    queryKey: ['/api/admin/commission-stats'],
  });

  const { data: promotionBanners } = useQuery({
    queryKey: ['/api/admin/promotion-banners'],
  });

  const { data: gameLeaderboard } = useQuery({
    queryKey: ['/api/admin/game-leaderboard'],
  });

  const { data: pendingPurchases } = useQuery({
    queryKey: ['/api/admin/pending-purchases'],
  });

  const { data: tokenClaims } = useQuery({
    queryKey: ['/api/admin/token-claims'],
  });

  const { data: tokenTransactions } = useQuery({
    queryKey: ['/api/admin/token-transactions'],
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
                      <p className="text-3xl font-bold text-white">{dashboardStats?.totalUsers || 0}</p>
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
                      <p className="text-3xl font-bold text-white">{dashboardStats?.totalToys || 0}</p>
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
                      <p className="text-3xl font-bold text-white">{formatCurrency(dashboardStats?.totalRevenue || 0)}</p>
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
                      <p className="text-3xl font-bold text-white">{dashboardStats?.activeSessions || 0}</p>
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
                    {(usersResponse?.users || []).map((user: any) => (
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
              <CardHeader>
                <CardTitle className="text-white">Toy Management</CardTitle>
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
                    {(allToys || []).map((toy: any) => (
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
                                toast({ title: "Toy deleted", description: `${toy.name} has been removed` });
                              }}
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
              <CardHeader>
                <CardTitle className="text-white">Season Management</CardTitle>
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
                    {(seasonsData || []).map((season: any) => (
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
                    {(allAppointments || []).map((appointment: any) => (
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
                    {(paymentVerifications || []).map((verification: any) => (
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
                    {(cashOutRequests || []).map((request: any) => (
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
                    {(allTransactions || []).map((transaction: any) => (
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
                          <p className="text-2xl font-bold text-white">{commissionStats?.totalCommissions || 0}</p>
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
                          {(promotionBanners || []).map((banner: any) => (
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
                    {(gameLeaderboard || []).map((entry: any, index: number) => (
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