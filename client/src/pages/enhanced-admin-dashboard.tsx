import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, DollarSign, AlertTriangle, Clock, Calendar, 
  Download, Search, Eye, Edit, Trash2, Check, X, 
  LogOut, ArrowUp, Settings, FileText, Star, 
  TrendingUp, ShoppingCart, Mail, Plus
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management for tabs and pagination
  const [activeTab, setActiveTab] = useState("users");
  const [userSearch, setUserSearch] = useState("");
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

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

  // Fetch users data
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: [`/api/admin/users?page=${userCurrentPage}&limit=${usersPerPage}`],
    enabled: activeTab === "users"
  });

  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.pagination?.totalCount || 0;
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Filter users based on search
  const filteredUsers = users.filter((user: any) =>
    user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Comprehensive system management and reporting</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowUp className="h-4 w-4 mr-2 rotate-180" />
              Go Back to User Dashboard
            </Button>
            <span className="text-gray-300">Welcome, {(user as any)?.firstName || (user as any)?.email || 'Admin'}</span>
            <Button
              onClick={() => window.location.href = '/api/logout'}
              variant="outline"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Total Users</p>
                  <p className="text-2xl font-semibold text-white">{totalUsers}</p>
                </div>
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 overflow-x-auto">
            <TabsList className="bg-slate-700/30 rounded-lg p-1 flex flex-wrap gap-1 min-w-max">
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-600/50 text-sm py-2 px-4 rounded-md transition-all whitespace-nowrap">
                Users
              </TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white text-lg font-medium">User Management</CardTitle>
                </div>
                <div className="flex gap-3 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* User Management Table */}
                <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow className="border-gray-600/30 bg-gray-700/30">
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[150px]">User</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[120px]">Role</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[100px]">Credits</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[100px]">Loyalty</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[100px]">Tokens</TableHead>
                          <TableHead className="text-gray-300 font-medium py-3 px-4 min-w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                              Loading users...
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user: any) => (
                            <TableRow key={user.id} className="border-gray-600/20 hover:bg-gray-700/30 transition-colors">
                              <TableCell className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="text-white font-medium text-sm">
                                    {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A'}
                                  </span>
                                  <span className="text-gray-400 text-xs">{user.email}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                                  {user.role || 'user'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="text-white text-sm">RP {user.credits?.toLocaleString() || '0'}</span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="text-white text-sm">{user.loyaltyPoints?.toLocaleString() || '0'}</span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="text-white text-sm">{user.tokens?.toLocaleString() || '0'}</span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/40">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserCurrentPage(Math.max(1, userCurrentPage - 1))}
                      disabled={userCurrentPage === 1}
                      className="bg-gray-800/50 border-gray-600/50 text-white hover:bg-gray-700/50"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={userCurrentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUserCurrentPage(pageNum)}
                            className={`min-w-[2rem] h-8 ${
                              userCurrentPage === pageNum 
                                ? "bg-blue-600 text-white" 
                                : "bg-white/10 border-gray-600/50 text-white hover:bg-gray-700/50"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserCurrentPage(Math.min(totalPages, userCurrentPage + 1))}
                      disabled={userCurrentPage === totalPages}
                      className="bg-gray-800/50 border-gray-600/50 text-white hover:bg-gray-700/50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

export default EnhancedAdminDashboard;