import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, ShoppingCart, Package, Database, BarChart3, Settings } from "lucide-react";

function WorkingAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // API queries
  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users', 1],
    enabled: activeTab === 'users'
  });

  const { data: toysResponse, isLoading: toysLoading, error: toysError } = useQuery({
    queryKey: ['/api/admin/all-toys'],
    enabled: activeTab === 'toys'
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/admin/transactions'],
    enabled: activeTab === 'transactions'
  });

  const { data: seasonsResponse } = useQuery({
    queryKey: ['/api/admin/seasons'],
    enabled: activeTab === 'seasons'
  });

  const { data: sectorsResponse } = useQuery({
    queryKey: ['/api/admin/sectors'],
    enabled: activeTab === 'seasons'
  });

  // Safe data access
  const usersData = usersResponse?.data || [];
  const toysData = Array.isArray(toysResponse?.data) ? toysResponse.data : [];
  const transactionsData = transactionsResponse?.data || [];
  const seasonsData = Array.isArray(seasonsResponse) ? seasonsResponse : [];
  const sectorsData = Array.isArray(sectorsResponse) ? sectorsResponse : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Manage your application and monitor system performance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white/10 backdrop-blur border-white/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-white/20">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="toys" className="data-[state=active]:bg-white/20">
              <Package className="h-4 w-4 mr-2" />
              Toys
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-white/20">
              <DollarSign className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="seasons" className="data-[state=active]:bg-white/20">
              <Database className="h-4 w-4 mr-2" />
              Seasons
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/20">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/20">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {usersLoading ? "--" : usersData.length}
                  </div>
                  <p className="text-xs text-gray-400">Registered users</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Toys</CardTitle>
                  <Package className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {toysLoading ? "--" : toysData.length}
                  </div>
                  <p className="text-xs text-gray-400">Available toys</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Transactions</CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {transactionsLoading ? "--" : transactionsData.length}
                  </div>
                  <p className="text-xs text-gray-400">Total transactions</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Seasons</CardTitle>
                  <Database className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {seasonsData.length}
                  </div>
                  <p className="text-xs text-gray-400">Active seasons</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <p className="text-gray-300 text-sm">View and manage user accounts</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">User Management System</div>
                  <div className="text-gray-300 mb-6">
                    {usersLoading ? "Loading users..." : `${usersData.length} users in system`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toys Tab - Working Implementation */}
          <TabsContent value="toys">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Toy Management Dashboard</CardTitle>
                <p className="text-gray-300 text-sm">Overview of toy inventory and management tools</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">Toy Management System</div>
                  {toysLoading ? (
                    <div className="text-gray-300 mb-6">Loading toy data...</div>
                  ) : toysError ? (
                    <div className="text-red-400 mb-6">Error loading toys</div>
                  ) : (
                    <div className="text-gray-300 mb-6">{toysData.length} toys in system</div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {toysLoading ? "--" : toysData.length}
                      </div>
                      <div className="text-sm text-gray-300">Total Toys</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {toysLoading ? "--" : toysData.filter((toy: any) => toy.owner).length}
                      </div>
                      <div className="text-sm text-gray-300">Owned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {toysLoading ? "--" : toysData.filter((toy: any) => !toy.owner).length}
                      </div>
                      <div className="text-sm text-gray-300">Available</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {toysLoading ? "--" : toysData.filter((toy: any) => 
                          toy.rarity === 'legendary' || toy.rarity === 'secret'
                        ).length}
                      </div>
                      <div className="text-sm text-gray-300">Rare Items</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Transaction Management</CardTitle>
                <p className="text-gray-300 text-sm">Monitor financial transactions and payments</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">Transaction System</div>
                  <div className="text-gray-300 mb-6">
                    {transactionsLoading ? "Loading transactions..." : `${transactionsData.length} transactions recorded`}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seasons Tab */}
          <TabsContent value="seasons">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Seasons Management</CardTitle>
                <p className="text-gray-300 text-sm">Configure seasonal collections and toy categories</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">Seasonal Collection Management</div>
                  <div className="text-gray-300 mb-6">Manage seasons, sectors, and seasonal exclusive items</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{seasonsData.length}</div>
                      <div className="text-sm text-gray-300">Total Seasons</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{sectorsData.length}</div>
                      <div className="text-sm text-gray-300">Sectors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">--</div>
                      <div className="text-sm text-gray-300">Seasonal Items</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">--</div>
                      <div className="text-sm text-gray-300">Collections</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Marketplace Management</CardTitle>
                <p className="text-gray-300 text-sm">Monitor marketplace activity and listings</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">Marketplace System</div>
                  <div className="text-gray-300 mb-6">Track marketplace listings and transactions</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <CardTitle className="text-white">System Settings</CardTitle>
                <p className="text-gray-300 text-sm">Configure application settings and preferences</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-white text-lg mb-4">System Configuration</div>
                  <div className="text-gray-300 mb-6">Manage system-wide settings and configurations</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default WorkingAdminDashboard;