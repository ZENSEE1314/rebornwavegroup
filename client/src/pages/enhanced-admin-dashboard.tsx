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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatMoney, formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
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
  Calendar,
  Award,
  Search,
  Download,
  Upload,
  FileText,
  Trash2,
  Filter
} from "lucide-react";

export default function EnhancedAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editedUserData, setEditedUserData] = useState<any>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const [newToy, setNewToy] = useState({
    name: "",
    series: "",
    rarity: "common",
    imageUrl: "",
    qrCode: ""
  });
  
  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [cashOutSearch, setCashOutSearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [toySearch, setToySearch] = useState("");
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  
  // Bulk upload states
  const [bulkToyData, setBulkToyData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Edit toy owner dialog states
  const [editOwnerDialog, setEditOwnerDialog] = useState(false);
  const [selectedToyForEdit, setSelectedToyForEdit] = useState<any>(null);
  const [newOwnerId, setNewOwnerId] = useState("");

  // Check if user is admin
  if (!user || user.role !== 'admin') {
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

  // Fetch all data
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  const { data: cashOutRequests = [] } = useQuery({
    queryKey: ['/api/admin/cash-outs'],
    retry: false,
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/admin/transactions'],
    retry: false,
  });

  const { data: allToys = [] } = useQuery({
    queryKey: ['/api/admin/all-toys'],
    retry: false,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['/api/admin/appointments'],
    retry: false,
  });

  const { data: feesReport = {} } = useQuery({
    queryKey: ['/api/admin/fees-report'],
    retry: false,
  });

  // Filter functions
  const filteredUsers = (allUsers as any[]).filter((user: any) => {
    const searchMatch = !userSearch || 
      user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase());
    return searchMatch;
  });

  const filteredCashOuts = (cashOutRequests as any[]).filter((cashOut: any) => {
    const searchMatch = !cashOutSearch || 
      cashOut.user?.firstName?.toLowerCase().includes(cashOutSearch.toLowerCase()) ||
      cashOut.user?.email?.toLowerCase().includes(cashOutSearch.toLowerCase());
    const statusMatch = statusFilter === "all" || cashOut.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const filteredTransactions = (allTransactions as any[]).filter((transaction: any) => {
    const searchMatch = !transactionSearch || 
      transaction.description?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      transaction.user?.firstName?.toLowerCase().includes(transactionSearch.toLowerCase());
    const typeMatch = typeFilter === "all" || transaction.type === typeFilter;
    return searchMatch && typeMatch;
  });

  const filteredToys = (allToys as any[]).filter((toy: any) => {
    const searchMatch = !toySearch || 
      toy.name?.toLowerCase().includes(toySearch.toLowerCase()) ||
      toy.series?.toLowerCase().includes(toySearch.toLowerCase());
    const rarityMatch = rarityFilter === "all" || toy.rarity === rarityFilter;
    return searchMatch && rarityMatch;
  });

  const filteredAppointments = (allAppointments as any[]).filter((appointment: any) => {
    const searchMatch = !appointmentSearch || 
      appointment.user?.firstName?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      appointment.service?.toLowerCase().includes(appointmentSearch.toLowerCase());
    const statusMatch = statusFilter === "all" || appointment.status === statusFilter;
    return searchMatch && statusMatch;
  });

  // Mutations
  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest('POST', '/api/admin/update-credits', { userId, amount });
    },
    onSuccess: () => {
      toast({ title: "Credits updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update credits", variant: "destructive" });
    }
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      return apiRequest('POST', '/api/admin/update-points', { userId, points });
    },
    onSuccess: () => {
      toast({ title: "Points updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update points", variant: "destructive" });
    }
  });

  const approveCashOutMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest('POST', '/api/admin/approve-cash-out', { id, status, adminNotes: notes });
    },
    onSuccess: () => {
      toast({ title: "Cash out request updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
    },
    onError: () => {
      toast({ title: "Failed to update cash out request", variant: "destructive" });
    }
  });

  const updateToyOwnerMutation = useMutation({
    mutationFn: async ({ toyId, newOwnerId }: { toyId: number; newOwnerId: string | null }) => {
      return apiRequest('PATCH', `/api/admin/toys/${toyId}/owner`, { newOwnerId });
    },
    onSuccess: () => {
      toast({ title: "Toy owner updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Failed to update toy owner", variant: "destructive" });
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

  const createToyMutation = useMutation({
    mutationFn: async (toyData: any) => {
      return apiRequest('POST', '/api/admin/create-toy', toyData);
    },
    onSuccess: () => {
      toast({ title: "Toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setNewToy({ name: "", series: "", rarity: "common", imageUrl: "", qrCode: "" });
    },
    onError: () => {
      toast({ title: "Failed to create toy", variant: "destructive" });
    }
  });

  const bulkCreateToysMutation = useMutation({
    mutationFn: async (toys: any[]) => {
      return apiRequest('POST', '/api/admin/toys/bulk', { toys });
    },
    onSuccess: () => {
      toast({ title: "Toys uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
      setBulkToyData("");
    },
    onError: () => {
      toast({ title: "Failed to upload toys", variant: "destructive" });
    }
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/admin/appointments/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Appointment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      setSelectedAppointment(null);
    },
    onError: () => {
      toast({ title: "Failed to update appointment", variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}`, userData);
    },
    onSuccess: () => {
      toast({ title: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingUser(null);
      setEditedUserData({});
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  });



  // Download functions
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

  const handleBulkUpload = () => {
    if (!bulkToyData.trim()) return;
    
    try {
      const lines = bulkToyData.trim().split('\n');
      const toys = lines.map(line => {
        const [name, series, rarity = 'common', imageUrl = ''] = line.split(',').map(s => s.trim());
        return {
          name,
          series,
          rarity,
          imageUrl,
          qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
      });
      
      bulkCreateToysMutation.mutate(toys);
    } catch (error) {
      toast({ title: "Invalid format. Use: name,series,rarity,imageUrl per line", variant: "destructive" });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setUploading(true);
    
    // Here you would typically upload to a file storage service
    // For now, we'll simulate with a placeholder URL
    const imageUrl = `/uploaded-images/${file.name}`;
    setNewToy({ ...newToy, imageUrl });
    setUploading(false);
    
    toast({ title: "Image uploaded successfully" });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      case 'secret': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to handle clicking on username in appointments
  const handleUserNameClick = (userId: string) => {
    setActiveTab("users");
    setHighlightedUserId(userId);
    setUserSearch(""); // Clear search to show all users
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedUserId(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-gray-300">Comprehensive system management and reporting</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-white">{filteredUsers.length}</p>
                </div>
                <Users className="h-8 w-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Admin Fees</p>
                  <p className="text-3xl font-bold text-white">RP {formatMoney((feesReport as any).totalAdminFees || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Transactions</p>
                  <p className="text-3xl font-bold text-white">{(feesReport as any).totalTransactions || 0}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/20 backdrop-blur border-gray-300/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-sm">Total Volume</p>
                  <p className="text-3xl font-bold text-white">RP {formatMoney((feesReport as any).totalVolume || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="bg-white/20 backdrop-blur border-gray-300/30 flex min-w-max">
              <TabsTrigger value="users" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="appointments" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="cashouts" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <CreditCard className="h-4 w-4 mr-2" />
                Cash Outs
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <History className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="toys" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <Package className="h-4 w-4 mr-2" />
                Toy Management
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-white/30 text-white whitespace-nowrap">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">User Management</CardTitle>
                  <div className="flex gap-2">
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
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-blue-200 min-w-[150px]">User</TableHead>
                        <TableHead className="text-blue-200 min-w-[180px]">Email</TableHead>
                        <TableHead className="text-blue-200 min-w-[140px]">Phone</TableHead>
                        <TableHead className="text-blue-200 min-w-[100px]">Credits</TableHead>
                        <TableHead className="text-blue-200 min-w-[80px]">Points</TableHead>
                        <TableHead className="text-blue-200 min-w-[80px]">Role</TableHead>
                        <TableHead className="text-blue-200 min-w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow 
                        key={user.id} 
                        className={`border-white/10 transition-colors ${
                          highlightedUserId === user.id ? 'bg-blue-500/20 border-blue-400/50' : ''
                        }`}
                      >
                        <TableCell className="text-white">
                {editingUser?.id === user.id ? (
                            <div className="flex flex-col sm:flex-row gap-1 min-w-0">
                              <Input
                                placeholder="First Name"
                                value={editedUserData.firstName || user.firstName || ''}
                                onChange={(e) => setEditedUserData({...editedUserData, firstName: e.target.value})}
                                className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[120px]"
                              />
                              <Input
                                placeholder="Last Name"
                                value={editedUserData.lastName || user.lastName || ''}
                                onChange={(e) => setEditedUserData({...editedUserData, lastName: e.target.value})}
                                className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[120px]"
                              />
                            </div>
                          ) : (
                            `${user.firstName || ''} ${user.lastName || ''}`
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <Input
                              placeholder="Email"
                              value={editedUserData.email || user.email || ''}
                              onChange={(e) => setEditedUserData({...editedUserData, email: e.target.value})}
                              className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[180px]"
                            />
                          ) : (
                            user.email
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {editingUser?.id === user.id ? (
                            <Input
                              placeholder="Phone Number"
                              value={editedUserData.phoneNumber || user.phoneNumber || ''}
                              onChange={(e) => setEditedUserData({...editedUserData, phoneNumber: e.target.value})}
                              className="bg-gray-800 border-gray-600 text-white text-sm h-10 min-w-[140px]"
                            />
                          ) : (
                            user.phoneNumber || 'Not set'
                          )}
                        </TableCell>
                        <TableCell className="text-green-300">RP {formatMoney(user.credits || 0)}</TableCell>
                        <TableCell className="text-purple-300">{user.loyaltyPoints || 0}</TableCell>
                        <TableCell>
                          {editingUser?.id === user.id ? (
                            <Select 
                              value={editedUserData.role || user.role || 'user'} 
                              onValueChange={(value) => setEditedUserData({...editedUserData, role: value})}
                            >
                              <SelectTrigger className="bg-gray-800 border-gray-600 text-white text-sm h-10 w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}>
                              {user.role || 'user'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingUser?.id === user.id ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => updateUserMutation.mutate({ 
                                    userId: user.id, 
                                    userData: editedUserData 
                                  })}
                                  className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditedUserData({});
                                  }}
                                  variant="outline"
                                  className="h-10 w-10 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditedUserData({
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    email: user.email,
                                    phoneNumber: user.phoneNumber,
                                    role: user.role
                                  });
                                }}
                                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  onClick={() => setSelectedUser(user)}
                                  className="bg-purple-600 hover:bg-purple-700 h-10 w-10 p-0"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-gray-900 border-gray-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Manage Credits & Points</DialogTitle>
                                </DialogHeader>
                                {selectedUser && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">Credits</Label>
                                      <Input
                                        type="number"
                                        defaultValue={selectedUser.credits}
                                        onChange={(e) => setSelectedUser({...selectedUser, credits: e.target.value})}
                                        className="bg-gray-800 border-gray-600 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Points</Label>
                                      <Input
                                        type="number"
                                        defaultValue={selectedUser.loyaltyPoints}
                                        onChange={(e) => setSelectedUser({...selectedUser, loyaltyPoints: e.target.value})}
                                        className="bg-gray-800 border-gray-600 text-white"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button 
                                        onClick={() => updateCreditsMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          amount: selectedUser.credits 
                                        })}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Update Credits
                                      </Button>
                                      <Button 
                                        onClick={() => updatePointsMutation.mutate({ 
                                          userId: selectedUser.id, 
                                          points: parseInt(selectedUser.loyaltyPoints) 
                                        })}
                                        className="bg-purple-600 hover:bg-purple-700"
                                      >
                                        Update Points
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
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
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search appointments..."
                      value={appointmentSearch}
                      onChange={(e) => setAppointmentSearch(e.target.value)}
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
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Service</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Time</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment: any) => (
                      <TableRow key={appointment.id} className="border-white/10">
                        <TableCell className="text-white">
                          <button
                            onClick={() => handleUserNameClick(appointment.userId)}
                            className="text-blue-300 hover:text-blue-100 underline cursor-pointer transition-colors"
                          >
                            {appointment.user?.firstName} {appointment.user?.lastName}
                          </button>
                        </TableCell>
                        <TableCell className="text-gray-300">{appointment.service}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            appointment.status === 'confirmed' ? 'bg-green-500' :
                            appointment.status === 'pending' ? 'bg-yellow-500' :
                            appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                          }>
                            {appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appointment.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'scheduled' 
                                })}
                                className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => updateAppointmentMutation.mutate({ 
                                  id: appointment.id, 
                                  status: 'cancelled' 
                                })}
                                className="bg-red-600 hover:bg-red-700 h-10 w-10 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Toy Management Tab */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Single Toy Creation */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Create New Toy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">Name</Label>
                      <Input
                        value={newToy.name}
                        onChange={(e) => setNewToy({ ...newToy, name: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Series</Label>
                      <Input
                        value={newToy.series}
                        onChange={(e) => setNewToy({ ...newToy, series: e.target.value })}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Rarity</Label>
                      <Select value={newToy.rarity} onValueChange={(value) => setNewToy({ ...newToy, rarity: value })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                          <SelectItem value="secret">Secret</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Image Upload</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button 
                        onClick={() => {
                          const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                          createToyMutation.mutate({ ...newToy, qrCode });
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!newToy.name || !newToy.series}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Toy
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Upload */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Bulk Toy Upload</CardTitle>
                  <p className="text-gray-300 text-sm">Format: name,series,rarity,imageUrl (one per line)</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Doluruu Blue #2001,Season 2 Collection,rare,/images/blue-toy.png"
                      value={bulkToyData}
                      onChange={(e) => setBulkToyData(e.target.value)}
                      className="bg-white/10 border-white/20 text-white min-h-32"
                    />
                    <Button 
                      onClick={handleBulkUpload}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!bulkToyData.trim()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Toys
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Toy List */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">All Toys</CardTitle>
                    <Button 
                      onClick={() => downloadCSV(filteredToys, 'toys')}
                      variant="outline" 
                      size="sm"
                      className="bg-white/10 text-white border-white/20"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search toys..."
                        value={toySearch}
                        onChange={(e) => setToySearch(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-300"
                      />
                    </div>
                    <Select value={rarityFilter} onValueChange={setRarityFilter}>
                      <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Filter by rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rarities</SelectItem>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-blue-200">Name</TableHead>
                        <TableHead className="text-blue-200">Series</TableHead>
                        <TableHead className="text-blue-200">Rarity</TableHead>
                        <TableHead className="text-blue-200">Owner</TableHead>
                        <TableHead className="text-blue-200">QR Code</TableHead>
                        <TableHead className="text-blue-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredToys.map((toy: any) => (
                        <TableRow key={toy.id} className="border-white/10">
                          <TableCell className="text-white">{toy.name}</TableCell>
                          <TableCell className="text-gray-300">{toy.series}</TableCell>
                          <TableCell>
                            <Badge className={getRarityColor(toy.rarity)}>
                              {toy.rarity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName}` : 'No Owner'}
                          </TableCell>
                          <TableCell className="text-gray-300 font-mono text-xs">{toy.qrCode}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 border-gray-700">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Edit Toy Owner</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">Current Owner</Label>
                                      <p className="text-white">
                                        {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName} (${toy.owner.email})` : 'No Owner'}
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Select New Owner</Label>
                                      <Select 
                                        value={newOwnerId} 
                                        onValueChange={setNewOwnerId}
                                      >
                                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                                          <SelectValue placeholder="Select a user or leave empty to remove owner" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-600">
                                          <SelectItem value="" className="text-white">
                                            Remove Owner
                                          </SelectItem>
                                          {(allUsers as any[])?.map((user: any) => (
                                            <SelectItem key={user.id} value={user.id} className="text-white">
                                              {user.firstName} {user.lastName} ({user.email})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={() => {
                                        updateToyOwnerMutation.mutate({ 
                                          toyId: toy.id, 
                                          newOwnerId: newOwnerId || null 
                                        });
                                        setNewOwnerId("");
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Update Owner
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteToyMutation.mutate(toy.id)}
                                className="bg-red-600 hover:bg-red-700 text-white border-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cash Outs Tab */}
          <TabsContent value="cashouts">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Cash Out Management</CardTitle>
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
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Amount</TableHead>
                      <TableHead className="text-blue-200">Bank Details</TableHead>
                      <TableHead className="text-blue-200">Status</TableHead>
                      <TableHead className="text-blue-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCashOuts.map((cashOut: any) => (
                      <TableRow key={cashOut.id} className="border-white/10">
                        <TableCell className="text-white">
                          {cashOut.user?.firstName} {cashOut.user?.lastName}
                        </TableCell>
                        <TableCell className="text-green-300">RP {cashOut.amount}</TableCell>
                        <TableCell className="text-gray-300">
                          {cashOut.bankName} - {cashOut.accountNumber}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            cashOut.status === 'approved' ? 'bg-green-500' :
                            cashOut.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }>
                            {cashOut.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cashOut.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => approveCashOutMutation.mutate({ 
                                  id: cashOut.id, 
                                  status: 'approved' 
                                })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => approveCashOutMutation.mutate({ 
                                  id: cashOut.id, 
                                  status: 'rejected' 
                                })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
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
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Transaction History</CardTitle>
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
                      <SelectItem value="marketplace_purchase">Marketplace</SelectItem>
                      <SelectItem value="appointment_payment">Appointment</SelectItem>
                      <SelectItem value="referral_bonus">Referral</SelectItem>
                      <SelectItem value="admin_adjustment">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20">
                      <TableHead className="text-blue-200">User</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">Amount</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-blue-200">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: any) => (
                      <TableRow key={transaction.id} className="border-white/10">
                        <TableCell className="text-white">
                          {transaction.user?.firstName} {transaction.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500">
                            {transaction.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-300">RP {transaction.amount}</TableCell>
                        <TableCell className="text-gray-300">{transaction.description}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Admin Fees Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Admin Fees:</span>
                      <span className="text-green-300 font-bold">
                        RP {(feesReport as any).totalAdminFees?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Transactions:</span>
                      <span className="text-white font-bold">{(feesReport as any).totalTransactions || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Volume:</span>
                      <span className="text-white font-bold">
                        RP {(feesReport as any).totalVolume?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Average Transaction:</span>
                      <span className="text-white font-bold">
                        RP {(feesReport as any).averageTransactionValue?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <Button 
                      onClick={() => downloadCSV([feesReport], 'admin-fees-report')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Users:</span>
                      <span className="text-white font-bold">{filteredUsers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Toys:</span>
                      <span className="text-white font-bold">{filteredToys.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pending Cash Outs:</span>
                      <span className="text-yellow-300 font-bold">
                        {filteredCashOuts.filter((co: any) => co.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Pending Appointments:</span>
                      <span className="text-yellow-300 font-bold">
                        {filteredAppointments.filter((apt: any) => apt.status === 'pending').length}
                      </span>
                    </div>
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