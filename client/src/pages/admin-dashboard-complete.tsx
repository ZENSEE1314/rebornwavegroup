import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Users, 
  DollarSign, 
  Package, 
  Calendar,
  Search,
  Download,
  Check,
  X,
  Edit,
  Trash2,
  Eye,
  Plus
} from 'lucide-react';

export default function CompleteAdminDashboard() {
  // State variables
  const [userSearch, setUserSearch] = useState('');
  const [cashOutSearch, setCashOutSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState('');
  
  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [tokenTransactionsPage, setTokenTransactionsPage] = useState(1);
  const [tokenTransactionsPerPage] = useState(10);

  // Data queries
  const { data: usersResponse } = useQuery({
    queryKey: [`/api/admin/users?page=${usersPage}&limit=10`],
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

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: false,
  });

  const { data: tokenTransactionsResponse } = useQuery({
    queryKey: [`/api/admin/token-transactions?page=${tokenTransactionsPage}&limit=${tokenTransactionsPerPage}`],
    retry: false,
  });

  const { data: tokenClaims = [] } = useQuery({
    queryKey: ['/api/admin/token-claims'],
    retry: false,
  });

  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ['/api/admin/all-pending-purchases'],
    retry: false,
  });

  const { data: gameLeaderboard = [] } = useQuery({
    queryKey: ['/api/game-scores/leaderboard'],
    retry: false,
  });

  const { data: promotionBanners = [] } = useQuery({
    queryKey: ['/api/admin/banners'],
    retry: false,
  });

  const { data: rewardItems = [] } = useQuery({
    queryKey: ['/api/admin/reward-items'],
    retry: false,
  });

  // Extract data
  const allUsers = (usersResponse as any)?.data || [];
  const cashOutRequests = (cashOutResponse as any)?.data || [];
  const tokenTransactions = (tokenTransactionsResponse as any)?.data || [];

  // Filter functions
  const filteredUsers = allUsers.filter((user: any) => {
    const searchMatch = !userSearch || 
      user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase());
    return searchMatch;
  });

  const filteredCashOuts = cashOutRequests.filter((cashOut: any) => {
    const searchMatch = !cashOutSearch || 
      cashOut.user?.firstName?.toLowerCase().includes(cashOutSearch.toLowerCase()) ||
      cashOut.user?.lastName?.toLowerCase().includes(cashOutSearch.toLowerCase()) ||
      cashOut.user?.email?.toLowerCase().includes(cashOutSearch.toLowerCase());
    const statusMatch = statusFilter === 'all' || cashOut.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const filteredTransactions = (allTransactions as any[]).filter((transaction: any) => {
    const searchMatch = !transactionSearch || 
      transaction.user?.firstName?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      transaction.user?.lastName?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      transaction.user?.email?.toLowerCase().includes(transactionSearch.toLowerCase());
    const typeMatch = typeFilter === 'all' || transaction.type === typeFilter;
    return searchMatch && typeMatch;
  });

  // Mutations
  const updateCashOutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) => {
      return apiRequest(`/api/admin/cashouts/${id}`, 'PATCH', { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
      toast({ title: "Cash out request updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update cash out request", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <div className="text-white">
            Welcome, Admin
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <TabsList className="grid w-full grid-cols-8 bg-white/20 backdrop-blur">
              <TabsTrigger value="users" className="data-[state=active]:bg-white/30 text-white">Users</TabsTrigger>
              <TabsTrigger value="cashouts" className="data-[state=active]:bg-white/30 text-white">Cash Outs</TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-white/30 text-white">Transactions</TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-white/30 text-white">Reports</TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-white/30 text-white">Content</TabsTrigger>
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white/30 text-white">Leaderboard</TabsTrigger>
              <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/30 text-white">Marketplace</TabsTrigger>
              <TabsTrigger value="tokens" className="data-[state=active]:bg-white/30 text-white">Tokens</TabsTrigger>
            </TabsList>
          </div>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">User Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Users: <span className="font-semibold">{allUsers.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(filteredUsers, 'users')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Name</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Phone</TableHead>
                        <TableHead className="text-gray-300">Credits</TableHead>
                        <TableHead className="text-gray-300">Tokens</TableHead>
                        <TableHead className="text-gray-300">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="text-white">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell className="text-gray-300">{user.email}</TableCell>
                          <TableCell className="text-gray-300">{user.phoneNumber || 'N/A'}</TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(user.credits || '0').toLocaleString()}
                          </TableCell>
                          <TableCell className="text-yellow-300">{user.tokens || 0}</TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Cash Out Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Requests: <span className="font-semibold">{cashOutRequests.length}</span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV(filteredCashOuts, 'cashouts')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search cash outs..."
                      value={cashOutSearch}
                      onChange={(e) => setCashOutSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Bank Details</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Requested</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCashOuts.map((cashOut: any) => (
                        <TableRow key={cashOut.id}>
                          <TableCell className="text-white">
                            {cashOut.user?.firstName} {cashOut.user?.lastName}
                            <div className="text-sm text-gray-400">{cashOut.user?.email}</div>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(cashOut.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="text-sm">
                              <div>{cashOut.bankName}</div>
                              <div>{cashOut.accountNumber}</div>
                              <div>{cashOut.accountHolderName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={cashOut.status === 'approved' ? 'default' : 
                                     cashOut.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {cashOut.status.charAt(0).toUpperCase() + cashOut.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(cashOut.createdAt)}
                          </TableCell>
                          <TableCell>
                            {cashOut.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => {
                                    updateCashOutMutation.mutate({ 
                                      id: cashOut.id, 
                                      status: 'approved', 
                                      adminNotes: '' 
                                    });
                                  }}
                                  disabled={updateCashOutMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => {
                                    updateCashOutMutation.mutate({ 
                                      id: cashOut.id, 
                                      status: 'rejected', 
                                      adminNotes: 'Rejected by admin' 
                                    });
                                  }}
                                  disabled={updateCashOutMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                {cashOut.status === 'approved' ? 'Approved' : 'Rejected'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Transaction Management</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="text-white">
                      Total Transactions: <span className="font-semibold">{allTransactions.length}</span>
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
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="topup">Top-up</SelectItem>
                      <SelectItem value="cashout">Cash Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Type</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Description</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction: any) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-white">
                            {transaction.user?.firstName} {transaction.user?.lastName}
                            <div className="text-sm text-gray-400">{transaction.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-400 text-blue-300">
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-green-300 font-semibold">
                            IDR {parseFloat(transaction.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={transaction.status === 'completed' ? 'default' : 
                                     transaction.status === 'failed' ? 'destructive' : 'secondary'}
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        IDR {(allTransactions as any[])
                          .filter((t: any) => t.type === 'purchase' && t.status === 'completed')
                          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
                          .toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">From completed purchases</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-400">{allUsers.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Total registered users</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Pending Cashouts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-400">
                        {cashOutRequests.filter((c: any) => c.status === 'pending').length}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Awaiting approval</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Token Claims</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-400">{tokenClaims.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Total claims processed</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Management Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Promotion Banners</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(promotionBanners) && promotionBanners.length > 0 ? (
                      promotionBanners.map((banner: any) => (
                        <div key={banner.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-semibold">{banner.title}</h3>
                              <p className="text-gray-300 text-sm mt-1">{banner.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                                  {banner.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline" className="border-blue-400 text-blue-300">
                                  {banner.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="border-white/20 text-white">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400">No banners available</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Reward Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(rewardItems) && rewardItems.length > 0 ? (
                      rewardItems.map((reward: any) => (
                        <div key={reward.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-semibold">{reward.name}</h3>
                              <p className="text-gray-300 text-sm mt-1">{reward.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="border-green-400 text-green-300">
                                  {reward.pointsCost} points
                                </Badge>
                                <Badge variant={reward.isAvailable ? 'default' : 'secondary'}>
                                  {reward.isAvailable ? 'Available' : 'Unavailable'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="border-white/20 text-white">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400">No reward items available</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Game Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Game Leaderboard Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Rank</TableHead>
                        <TableHead className="text-gray-300">Player</TableHead>
                        <TableHead className="text-gray-300">Score</TableHead>
                        <TableHead className="text-gray-300">Tokens Earned</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(gameLeaderboard) && gameLeaderboard.length > 0 ? (
                        gameLeaderboard.map((entry: any, index: number) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-white font-semibold">
                              #{index + 1}
                            </TableCell>
                            <TableCell className="text-white">
                              {entry.user?.firstName} {entry.user?.lastName}
                              <div className="text-sm text-gray-400">{entry.user?.email}</div>
                            </TableCell>
                            <TableCell className="text-blue-300 font-semibold">
                              {entry.score.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-green-300">
                              {entry.tokensEarned || 0}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {formatDate(entry.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400">
                            No leaderboard data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Purchases Tab */}
          <TabsContent value="marketplace">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Marketplace Purchase Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Buyer</TableHead>
                        <TableHead className="text-gray-300">Seller</TableHead>
                        <TableHead className="text-gray-300">Toy</TableHead>
                        <TableHead className="text-gray-300">Price</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(pendingPurchases) && pendingPurchases.length > 0 ? (
                        pendingPurchases.map((purchase: any) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="text-white">
                              {purchase.buyer?.firstName} {purchase.buyer?.lastName}
                              <div className="text-sm text-gray-400">{purchase.buyer?.email}</div>
                            </TableCell>
                            <TableCell className="text-white">
                              {purchase.seller?.firstName} {purchase.seller?.lastName}
                              <div className="text-sm text-gray-400">{purchase.seller?.email}</div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {purchase.listing?.toy?.name}
                              <div className="text-sm text-gray-400">
                                {purchase.listing?.toy?.rarity} • {purchase.listing?.toy?.color}
                              </div>
                            </TableCell>
                            <TableCell className="text-green-300 font-semibold">
                              IDR {parseFloat(purchase.listing?.price || '0').toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={purchase.status === 'completed' ? 'default' : 
                                       purchase.status === 'failed' ? 'destructive' : 'secondary'}
                              >
                                {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {formatDate(purchase.createdAt)}
                            </TableCell>
                            <TableCell>
                              {purchase.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Check className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                  <Button variant="destructive" size="sm">
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400">
                            No marketplace purchases available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Management Tab */}
          <TabsContent value="tokens">
            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Claims Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-300">User</TableHead>
                          <TableHead className="text-gray-300">Tokens Awarded</TableHead>
                          <TableHead className="text-gray-300">Reward Date</TableHead>
                          <TableHead className="text-gray-300">Pet Count</TableHead>
                          <TableHead className="text-gray-300">All Pets Healthy</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(tokenClaims) && tokenClaims.length > 0 ? (
                          tokenClaims.map((claim: any) => (
                            <TableRow key={claim.id}>
                              <TableCell className="text-white">
                                {claim.user?.firstName} {claim.user?.lastName}
                                <div className="text-sm text-gray-400">{claim.user?.email}</div>
                              </TableCell>
                              <TableCell className="text-green-300 font-semibold">
                                {claim.tokensAwarded}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {formatDate(claim.rewardDate)}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {claim.petCount || 0}
                              </TableCell>
                              <TableCell>
                                <Badge variant={claim.allPetsHealthy ? 'default' : 'secondary'}>
                                  {claim.allPetsHealthy ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  Processed
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-400">
                              No token claims available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">Token Transaction Management</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="text-white">
                        Total Transactions: <span className="font-semibold">{tokenTransactions.length}</span>
                      </div>
                      <Button 
                        onClick={() => downloadCSV(tokenTransactions, 'token-transactions')}
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
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-gray-300">User</TableHead>
                          <TableHead className="text-gray-300">Type</TableHead>
                          <TableHead className="text-gray-300">Tokens</TableHead>
                          <TableHead className="text-gray-300">Description</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-300">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(tokenTransactions) && tokenTransactions.length > 0 ? (
                          tokenTransactions.map((transaction: any) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-white">
                                {transaction.user?.firstName} {transaction.user?.lastName}
                                <div className="text-sm text-gray-400">{transaction.user?.email}</div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={transaction.type === 'earned' ? 'default' : 'secondary'}
                                  className={transaction.type === 'earned' ? 'bg-green-600' : 'bg-red-600'}
                                >
                                  {transaction.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-yellow-300 font-semibold">
                                {transaction.tokens > 0 ? '+' : ''}{transaction.tokens}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {transaction.description}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {transaction.status || 'completed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {formatDate(transaction.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-400">
                              No token transactions available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}