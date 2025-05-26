import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Calendar, 
  Store, 
  Gift, 
  Plus, 
  Shield, 
  Settings,
  TrendingUp,
  DollarSign,
  Star
} from "lucide-react";
import { formatCurrency, formatDateTime, generateAvatarUrl, getStatusColor, getRarityColor } from "@/lib/utils";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isCreateToyOpen, setIsCreateToyOpen] = useState(false);
  const [toyData, setToyData] = useState({
    name: "",
    series: "",
    rarity: "common",
    qrCode: "",
    originalPrice: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
  });

  const { data: listings } = useQuery({
    queryKey: ["/api/marketplace/listings"],
  });

  const createToyMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/toys", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Toy created successfully!",
      });
      setIsCreateToyOpen(false);
      setToyData({
        name: "",
        series: "",
        rarity: "common",
        qrCode: "",
        originalPrice: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create toy",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleCreateToy = (e: React.FormEvent) => {
    e.preventDefault();
    createToyMutation.mutate(toyData);
  };

  const handleUpdateUserRole = (userId: string, role: string) => {
    updateUserRoleMutation.mutate({ userId, role });
  };

  // Calculate stats
  const totalUsers = allUsers?.length || 0;
  const totalAppointments = appointments?.length || 0;
  const totalListings = listings?.length || 0;
  const totalRevenue = appointments?.reduce((sum: number, apt: any) => sum + Number(apt.cost), 0) || 0;

  if (usersLoading || appointmentsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="flex space-x-4">
          <Dialog open={isCreateToyOpen} onOpenChange={setIsCreateToyOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Toy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Toy</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateToy} className="space-y-4">
                <div>
                  <Label htmlFor="name">Toy Name</Label>
                  <Input
                    id="name"
                    value={toyData.name}
                    onChange={(e) => setToyData({ ...toyData, name: e.target.value })}
                    placeholder="e.g., Rainbow Unicorn"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="series">Series</Label>
                  <Input
                    id="series"
                    value={toyData.series}
                    onChange={(e) => setToyData({ ...toyData, series: e.target.value })}
                    placeholder="e.g., Magical Series #4"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="rarity">Rarity</Label>
                  <Select
                    value={toyData.rarity}
                    onValueChange={(value) => setToyData({ ...toyData, rarity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="ultra_rare">Ultra Rare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="qrCode">QR Code</Label>
                  <Input
                    id="qrCode"
                    value={toyData.qrCode}
                    onChange={(e) => setToyData({ ...toyData, qrCode: e.target.value })}
                    placeholder="Unique QR code for this toy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="originalPrice">Original Price ($)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={toyData.originalPrice}
                    onChange={(e) => setToyData({ ...toyData, originalPrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createToyMutation.isPending}>
                  {createToyMutation.isPending ? "Creating..." : "Create Toy"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-slate-800">{totalUsers}</p>
                <p className="text-emerald-600 text-sm font-medium">Registered members</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Appointments</p>
                <p className="text-2xl font-bold text-slate-800">{totalAppointments}</p>
                <p className="text-primary-600 text-sm font-medium">All time bookings</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Active Listings</p>
                <p className="text-2xl font-bold text-slate-800">{totalListings}</p>
                <p className="text-amber-600 text-sm font-medium">Marketplace items</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</p>
                <p className="text-purple-600 text-sm font-medium">From appointments</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allUsers && allUsers.length > 0 ? (
                  allUsers.map((userItem: any) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <img 
                          src={userItem.profileImageUrl || generateAvatarUrl(`${userItem.firstName} ${userItem.lastName}`)}
                          alt="User" 
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-slate-800">
                            {userItem.firstName} {userItem.lastName}
                          </p>
                          <p className="text-sm text-slate-600">{userItem.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={userItem.role === 'admin' ? 'default' : 'secondary'}>
                              {userItem.role}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Level {userItem.level} • {userItem.loyaltyPoints} pts
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm">
                          <p className="font-medium">{formatCurrency(userItem.credits)}</p>
                          <p className="text-slate-500">Credits</p>
                        </div>
                        <Select
                          value={userItem.role}
                          onValueChange={(role) => handleUpdateUserRole(userItem.id, role)}
                          disabled={updateUserRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments && appointments.length > 0 ? (
                  appointments.map((appointment: any) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-900">{appointment.title}</h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        {appointment.description && (
                          <p className="text-sm text-slate-600 mb-2">{appointment.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span>User ID: {appointment.userId}</span>
                          <span>{formatDateTime(appointment.appointmentDate)}</span>
                          <span>{appointment.duration} minutes</span>
                          <span className="font-medium text-slate-800">{formatCurrency(appointment.cost)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {listings && listings.length > 0 ? (
                  listings.map((listing: any) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-900">
                            {listing.toy?.name || 'Unknown Toy'}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge className={getRarityColor(listing.toy?.rarity || 'common')}>
                              {listing.toy?.rarity || 'common'}
                            </Badge>
                            <Badge className={getStatusColor(listing.status)}>
                              {listing.status}
                            </Badge>
                          </div>
                        </div>
                        {listing.description && (
                          <p className="text-sm text-slate-600 mb-2">{listing.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span>Seller ID: {listing.sellerId}</span>
                          <span>Series: {listing.toy?.series || 'Unknown'}</span>
                          <span className="font-medium text-slate-800">{formatCurrency(listing.price)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No listings found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">User Growth Rate</span>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium text-emerald-600">12.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Monthly Active Users</span>
                    <span className="font-medium">{Math.floor(totalUsers * 0.75)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Average Session Duration</span>
                    <span className="font-medium">8.2 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Average Order Value</span>
                    <span className="font-medium">
                      {formatCurrency(totalAppointments > 0 ? totalRevenue / totalAppointments : 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Monthly Recurring Revenue</span>
                    <span className="font-medium">{formatCurrency(totalRevenue * 0.4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Conversion Rate</span>
                    <span className="font-medium">3.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
