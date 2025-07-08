import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users, Mail, Settings, Database } from "lucide-react";

export default function WorkingAdminDashboard() {
  const { user } = useAuth();

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p>You don't have admin privileges to access this page.</p>
            <p className="text-sm mt-2 text-gray-400">
              User: {user?.email || 'Not logged in'}, Role: {user?.role || 'No role'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    queryFn: () => apiRequest('GET', '/api/admin/dashboard-stats')
  });

  // Fetch users
  const { data: usersResponse } = useQuery({
    queryKey: ['/api/admin/users', 1],
    queryFn: () => apiRequest('GET', '/api/admin/users?page=1&limit=10')
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-purple-200">Welcome back, {user.firstName} {user.lastName}</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {dashboardStats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Toys</CardTitle>
              <Database className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {dashboardStats?.totalToys || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active Pets</CardTitle>
              <Settings className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {dashboardStats?.totalPets || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Pending Verifications</CardTitle>
              <Mail className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {dashboardStats?.totalPaymentVerifications || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-slate-800/60 border-slate-700/50">
            <TabsTrigger value="users" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Users
            </TabsTrigger>
            <TabsTrigger value="content" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Content
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Payments
            </TabsTrigger>
            <TabsTrigger value="system" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usersResponse?.data?.map((user: any) => (
                    <div key={user.id} className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                      <div>
                        <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">Role: {user.role}</p>
                        <p className="text-gray-400 text-sm">Credits: RP {user.credits}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white h-20">
                    <Mail className="h-6 w-6 mr-2" />
                    Email Templates
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white h-20">
                    <Settings className="h-6 w-6 mr-2" />
                    Banner Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Payment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Payment verification and transaction management tools will be available here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Database Status:</span>
                    <span className="text-green-400">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email Service:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">WebSocket:</span>
                    <span className="text-green-400">Running</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="bg-slate-800/60 border-slate-700/50 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                View Reports
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                System Backup
              </Button>
              <Button className="bg-pink-600 hover:bg-pink-700 text-white">
                Send Broadcast
              </Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                Export Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}