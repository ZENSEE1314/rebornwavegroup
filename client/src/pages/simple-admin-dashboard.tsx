import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Users, DollarSign, CreditCard, TrendingUp, Edit, Trash2 } from "lucide-react";

function SimpleAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [usersPage, setUsersPage] = useState(1);
  const usersPerPage = 10;

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

  // Fetch data with pagination
  const { data: usersResponse } = useQuery({
    queryKey: [`/api/admin/users?page=${usersPage}&limit=${usersPerPage}`],
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

  const { data: toysResponse } = useQuery({
    queryKey: [`/api/admin/all-toys?page=1&limit=10`],
    retry: false,
  });

  // Extract data arrays from responses
  const allUsers = (usersResponse as any)?.data || [];
  const cashOutRequests = (cashOutResponse as any)?.data || [];
  const allTransactions = (transactionsResponse as any)?.data || [];
  const allToys = (toysResponse as any)?.data || [];

  // Calculate statistics
  const totalUsers = (usersResponse as any)?.pagination?.totalCount || 0;
  const totalCashOuts = cashOutRequests.length;
  const totalTransactions = allTransactions.length;
  const totalToys = (toysResponse as any)?.pagination?.totalCount || 0;

  // Mutations for basic operations
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  });

  const deleteToyMutation = useMutation({
    mutationFn: async (toyId: number) => {
      return apiRequest('DELETE', `/api/admin/toys/${toyId}`);
    },
    onSuccess: () => {
      toast({ title: "Toy deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Failed to delete toy", variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">System management and reporting</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {(user as any)?.firstName || (user as any)?.email || 'Admin'}</span>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Users</p>
                  <p className="text-white text-3xl font-bold">{totalUsers}</p>
                </div>
                <Users className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Cash Outs</p>
                  <p className="text-white text-3xl font-bold">{totalCashOuts}</p>
                </div>
                <DollarSign className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Transactions</p>
                  <p className="text-white text-3xl font-bold">{totalTransactions}</p>
                </div>
                <CreditCard className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Total Toys</p>
                  <p className="text-white text-3xl font-bold">{totalToys}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600">Overview</TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-blue-600">Users</TabsTrigger>
            <TabsTrigger value="cashouts" className="text-white data-[state=active]:bg-blue-600">Cash Outs</TabsTrigger>
            <TabsTrigger value="toys" className="text-white data-[state=active]:bg-blue-600">Toys</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-white">
                  <div>
                    <p className="text-gray-400">Total Users:</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Toys:</p>
                    <p className="text-2xl font-bold">{totalToys}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cash Out Requests:</p>
                    <p className="text-2xl font-bold">{totalCashOuts}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Transactions:</p>
                    <p className="text-2xl font-bold">{totalTransactions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-blue-200">ID</TableHead>
                      <TableHead className="text-blue-200">Name</TableHead>
                      <TableHead className="text-blue-200">Email</TableHead>
                      <TableHead className="text-blue-200">Credits</TableHead>
                      <TableHead className="text-blue-200">Tokens</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user: any) => (
                      <TableRow key={user.id} className="border-gray-600">
                        <TableCell className="text-white">{user.id}</TableCell>
                        <TableCell className="text-white">{user.firstName} {user.lastName}</TableCell>
                        <TableCell className="text-white">{user.email}</TableCell>
                        <TableCell className="text-white">{formatMoney(user.credits)}</TableCell>
                        <TableCell className="text-white">{user.tokens || 0}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="text-blue-400 border-blue-400">
                              <Edit className="w-4 h-4" />
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

          <TabsContent value="cashouts" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Cash Out Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-blue-200">ID</TableHead>
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Amount</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashOutRequests.map((request: any) => (
                      <TableRow key={request.id} className="border-gray-600">
                        <TableCell className="text-white">{request.id}</TableCell>
                        <TableCell className="text-white">{request.user?.email}</TableCell>
                        <TableCell className="text-white">{formatMoney(request.amount)}</TableCell>
                        <TableCell className="text-white">{request.status}</TableCell>
                        <TableCell className="text-white">{formatDate(request.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="toys" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Toy Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="text-blue-200">ID</TableHead>
                      <TableHead className="text-blue-200">Name</TableHead>
                      <TableHead className="text-blue-200">Series</TableHead>
                      <TableHead className="text-blue-200">Rarity</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allToys.map((toy: any) => (
                      <TableRow key={toy.id} className="border-gray-600">
                        <TableCell className="text-white">{toy.id}</TableCell>
                        <TableCell className="text-white">{toy.name}</TableCell>
                        <TableCell className="text-white">{toy.series}</TableCell>
                        <TableCell className="text-white">{toy.rarity}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-400 border-red-400"
                              onClick={() => deleteToyMutation.mutate(toy.id)}
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
        </Tabs>
      </div>
    </div>
  );
}

export default SimpleAdminDashboard;