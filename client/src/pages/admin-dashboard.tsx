import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Users,
  DollarSign,
  ShoppingCart,
  Award,
  Edit,
  TrendingUp,
  Package,
  History
} from "lucide-react";

function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");

  // Fetch admin data with proper error handling
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const { data: toysResponse, isLoading: toysLoading } = useQuery({
    queryKey: ["/api/admin/all-toys"],
    enabled: !!user?.isAdmin,
  });

  const { data: paymentsResponse, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/admin/payment-verifications"],
    enabled: !!user?.isAdmin,
  });

  const { data: marketplaceResponse, isLoading: marketplaceLoading } = useQuery({
    queryKey: ["/api/admin/all-pending-purchases"],
    enabled: !!user?.isAdmin,
  });

  const { data: tokensResponse, isLoading: tokensLoading } = useQuery({
    queryKey: ["/api/admin/token-transactions"],
    enabled: !!user?.isAdmin,
  });

  const { data: bannersResponse, isLoading: bannersLoading } = useQuery({
    queryKey: ["/api/admin/banners"],
    enabled: !!user?.isAdmin,
  });

  const { data: leaderboardResponse, isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/game-scores/leaderboard"],
    enabled: !!user?.isAdmin,
  });

  // Extract data with fallbacks
  const allUsers = usersResponse?.data || [];
  const allToys = toysResponse?.data || [];
  const paymentVerifications = paymentsResponse?.data || [];
  const marketplaceListings = marketplaceResponse || [];
  const tokenTransactions = tokensResponse?.data || [];
  const promotionBanners = bannersResponse || [];
  const gameLeaderboard = leaderboardResponse || [];

  // Mutation for payment approval
  const approvePaymentMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiRequest("POST", `/api/admin/payment-verification/${id}/approve`);
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
    mutationFn: async ({ id }: { id: number }) => {
      return apiRequest("POST", `/api/admin/payment-verification/${id}/reject`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payment rejected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-verifications"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject payment", variant: "destructive" });
    }
  });

  const formatCurrency = (amount: string | number) => {
    return `Rp ${parseInt(amount.toString()).toLocaleString('id-ID')}`;
  };

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 p-8">
          <CardContent className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-purple-200">You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
                  <p className="text-purple-200 text-sm">Pending Payments</p>
                  <p className="text-2xl font-bold text-white">{paymentVerifications.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm">Marketplace Orders</p>
                  <p className="text-2xl font-bold text-white">{marketplaceListings.length}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-orange-300" />
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

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 bg-white/10 backdrop-blur-md">
            <TabsTrigger value="users" className="data-[state=active]:bg-white/20 text-white">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/20 text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/20 text-white">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-white/20 text-white">
              <Award className="w-4 h-4 mr-2" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-white/20 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/20 text-white">
              <History className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center text-white">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">Name</TableHead>
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
                          <TableCell className="text-white">{user.email}</TableCell>
                          <TableCell className="text-white">{formatCurrency(user.credits || 0)}</TableCell>
                          <TableCell className="text-white">{user.loyaltyPoints || 0}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.isAdmin ? 'bg-red-600' : 'bg-blue-600'
                            }`}>
                              {user.isAdmin ? 'Admin' : 'User'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Payment Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="text-center text-white">Loading payments...</div>
                ) : (
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
                      {paymentVerifications.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-white">{payment.userId}</TableCell>
                          <TableCell className="text-white">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="text-white">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === 'approved' ? 'bg-green-600' : 
                              payment.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'
                            }`}>
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-purple-200">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => approvePaymentMutation.mutate({ id: payment.id })}
                                disabled={approvePaymentMutation.isPending}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => rejectPaymentMutation.mutate({ id: payment.id })}
                                disabled={rejectPaymentMutation.isPending}
                                size="sm"
                                variant="destructive"
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                {marketplaceLoading ? (
                  <div className="text-center text-white">Loading marketplace data...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">ID</TableHead>
                        <TableHead className="text-purple-200">Buyer</TableHead>
                        <TableHead className="text-purple-200">Seller</TableHead>
                        <TableHead className="text-purple-200">Amount</TableHead>
                        <TableHead className="text-purple-200">Status</TableHead>
                        <TableHead className="text-purple-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketplaceListings.map((purchase: any) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="text-white">#{purchase.id}</TableCell>
                          <TableCell className="text-white">{purchase.buyerId}</TableCell>
                          <TableCell className="text-white">{purchase.sellerId}</TableCell>
                          <TableCell className="text-white">{formatCurrency(purchase.amount)}</TableCell>
                          <TableCell className="text-white">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              purchase.status === 'completed' ? 'bg-green-600' : 
                              purchase.status === 'cancelled' ? 'bg-red-600' : 'bg-yellow-600'
                            }`}>
                              {purchase.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Token Management</CardTitle>
              </CardHeader>
              <CardContent>
                {tokensLoading ? (
                  <div className="text-center text-white">Loading token data...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-purple-200">User</TableHead>
                        <TableHead className="text-purple-200">Type</TableHead>
                        <TableHead className="text-purple-200">Tokens</TableHead>
                        <TableHead className="text-purple-200">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tokenTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-white">{transaction.userId}</TableCell>
                          <TableCell className="text-white">{transaction.type}</TableCell>
                          <TableCell className="text-white">{transaction.tokens}</TableCell>
                          <TableCell className="text-purple-200">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                {bannersLoading ? (
                  <div className="text-center text-white">Loading content...</div>
                ) : (
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
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              banner.isActive ? 'bg-green-600' : 'bg-gray-600'
                            }`}>
                              {banner.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">System Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">User Statistics</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-200">Total Users:</span>
                          <span className="text-white font-semibold">{allUsers.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-200">Admin Users:</span>
                          <span className="text-white font-semibold">
                            {allUsers.filter((u: any) => u.isAdmin).length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">System Activity</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-200">Pending Payments:</span>
                          <span className="text-white font-semibold">{paymentVerifications.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-200">Active Toys:</span>
                          <span className="text-white font-semibold">{allToys.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminDashboard;