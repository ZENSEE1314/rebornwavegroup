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
  CreditCard,
  History,
  ShoppingCart,
  Award,
  Edit,
  TrendingUp,
  Package
} from "lucide-react";

function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");

  // Fetch all admin data
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: allToys = [] } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });

  const { data: paymentVerifications = [] } = useQuery({
    queryKey: ["/api/admin/payment-verifications"],
  });

  const { data: marketplaceListings = [] } = useQuery({
    queryKey: ["/api/admin/all-pending-purchases"],
  });

  const { data: tokenTransactions = [] } = useQuery({
    queryKey: ["/api/admin/token-transactions"],
  });

  const { data: tokenClaims = [] } = useQuery({
    queryKey: ["/api/admin/token-claims"],
  });

  const { data: promotionBanners = [] } = useQuery({
    queryKey: ["/api/admin/banners"],
  });

  const { data: gameLeaderboard = [] } = useQuery({
    queryKey: ["/api/game-scores/leaderboard"],
  });

  // Mutations for admin actions
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
                  <p className="text-2xl font-bold text-white">{Array.isArray(allUsers) ? allUsers.length : 0}</p>
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
                  <p className="text-2xl font-bold text-white">{Array.isArray(paymentVerifications) ? paymentVerifications.length : 0}</p>
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
                  <p className="text-2xl font-bold text-white">{Array.isArray(marketplaceListings) ? marketplaceListings.length : 0}</p>
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
                  <p className="text-2xl font-bold text-white">{Array.isArray(allToys) ? allToys.length : 0}</p>
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
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">
              <History className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/20">
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
                    {Array.isArray(allUsers) && allUsers.map((user: any) => (
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {/* Handle user edit */}}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => {/* Handle user suspend */}}
                              size="sm"
                              variant="destructive"
                            >
                              Suspend
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
                    {Array.isArray(paymentVerifications) && paymentVerifications.map((payment: any) => (
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Management Tab */}
          <TabsContent value="marketplace">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Marketplace Management</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {Array.isArray(marketplaceListings) && marketplaceListings.map((purchase: any) => (
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
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {/* Handle marketplace action */}}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => {/* Handle marketplace action */}}
                              size="sm"
                              variant="destructive"
                            >
                              Cancel
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

          {/* Token Management Tab */}
          <TabsContent value="tokens">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Token Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Token Transactions</h3>
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
                        {Array.isArray(tokenTransactions) && tokenTransactions.map((transaction: any) => (
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
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Token Claims</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-purple-200">User</TableHead>
                          <TableHead className="text-purple-200">Tokens</TableHead>
                          <TableHead className="text-purple-200">Source</TableHead>
                          <TableHead className="text-purple-200">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(tokenClaims) && tokenClaims.map((claim: any) => (
                          <TableRow key={claim.id}>
                            <TableCell className="text-white">{claim.userId}</TableCell>
                            <TableCell className="text-white">{claim.tokensAwarded}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs bg-purple-600">
                                {claim.source}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => {/* Handle token claim action */}}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Process
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Promotion Banners</h3>
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
                        {Array.isArray(promotionBanners) && promotionBanners.map((banner: any) => (
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
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {/* Handle banner toggle */}}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Toggle
                                </Button>
                                <Button
                                  onClick={() => {/* Handle banner edit */}}
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-600 text-gray-300"
                                >
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                      <TableHead className="text-purple-200">Player</TableHead>
                      <TableHead className="text-purple-200">Score</TableHead>
                      <TableHead className="text-purple-200">Tokens Earned</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(gameLeaderboard) && gameLeaderboard.map((entry: any, index: number) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-white">#{index + 1}</TableCell>
                        <TableCell className="text-white">{entry.userId}</TableCell>
                        <TableCell className="text-white">{entry.score}</TableCell>
                        <TableCell className="text-white">{entry.tokensEarned}</TableCell>
                        <TableCell className="text-purple-200">
                          {new Date(entry.createdAt).toLocaleDateString()}
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
                <CardTitle className="text-white">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-purple-200">ID</TableHead>
                      <TableHead className="text-purple-200">User</TableHead>
                      <TableHead className="text-purple-200">Type</TableHead>
                      <TableHead className="text-purple-200">Amount</TableHead>
                      <TableHead className="text-purple-200">Status</TableHead>
                      <TableHead className="text-purple-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Transaction data would be loaded here */}
                    <TableRow>
                      <TableCell className="text-white text-center" colSpan={6}>
                        No transactions found
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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
                      <h3 className="text-lg font-semibold text-white mb-4">Revenue Report</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-200">Total Revenue:</span>
                          <span className="text-white font-semibold">Rp 0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-200">Admin Fees:</span>
                          <span className="text-white font-semibold">Rp 0</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">User Activity</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-purple-200">Active Users:</span>
                          <span className="text-white font-semibold">{Array.isArray(allUsers) ? allUsers.length : 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-200">New Users (Today):</span>
                          <span className="text-white font-semibold">0</span>
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