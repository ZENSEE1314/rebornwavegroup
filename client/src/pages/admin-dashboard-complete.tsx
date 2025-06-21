import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [cashOutSearch, setCashOutSearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateToyForm, setTemplateToyForm] = useState({
    name: "",
    seasonId: "",
    rarity: "common",
    color: "blue",
    gender: "male",
    imageUrl: "",
    quantity: 1
  });

  // Check if user is admin
  if (!user || (user as any)?.role !== 'admin') {
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

  // Data fetching
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/admin/users"],
  });
  const allUsers = (usersResponse as any)?.data || [];

  const { data: cashOutRequests = [] } = useQuery({
    queryKey: ["/api/admin/cash-outs"],
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });

  const { data: allToys = [] } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });

  const { data: templateToysResponse } = useQuery({
    queryKey: ["/api/admin/template-toys"],
  });
  const templateToys = (templateToysResponse as any)?.data || [];

  const { data: seasons } = useQuery({
    queryKey: ["/api/seasons"],
  });

  // Mutations
  const createTemplateToyMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest('POST', '/api/admin/toys/create-template', templateData);
    },
    onSuccess: () => {
      toast({ title: "Template toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/template-toys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/seasonal-toys'] });
      setShowTemplateDialog(false);
      setTemplateToyForm({
        name: "",
        seasonId: "",
        rarity: "common",
        color: "blue",
        gender: "male",
        imageUrl: "",
        quantity: 1
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to create template toy";
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  });

  const updateCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: string }) => {
      return apiRequest("POST", "/api/admin/update-credits", { userId, amount });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User credits updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update credits", variant: "destructive" });
    }
  });

  const updatePointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      return apiRequest("POST", "/api/admin/update-points", { userId, points });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "User points updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update points", variant: "destructive" });
    }
  });

  const updateCashOutMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/admin/cash-out/${id}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Cash out request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-outs"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update cash out request", variant: "destructive" });
    }
  });

  const deleteToyMutation = useMutation({
    mutationFn: async (toyId: number) => {
      return apiRequest("DELETE", `/api/admin/toys/${toyId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Toy deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/all-toys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-toys"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete toy", variant: "destructive" });
    }
  });

  // Helper functions
  const getRarityColor = (rarity: string) => {
    const colors = {
      common: "bg-gray-500",
      uncommon: "bg-green-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500"
    };
    return colors[rarity as keyof typeof colors] || "bg-gray-500";
  };

  const getGenderColor = (gender: string) => {
    return gender === 'male' ? "bg-blue-500" : "bg-pink-500";
  };

  const handleTemplateSubmit = () => {
    if (!templateToyForm.name || !templateToyForm.seasonId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createTemplateToyMutation.mutate({
      ...templateToyForm,
      seasonId: parseInt(templateToyForm.seasonId),
      quantity: templateToyForm.quantity
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-3xl font-bold">Admin Dashboard</CardTitle>
          </CardHeader>
        </Card>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="cashouts">Cash Outs</TabsTrigger>
            <TabsTrigger value="toys">All Toys</TabsTrigger>
            <TabsTrigger value="templates">Template Toys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                  />
                  
                  <div className="grid gap-4">
                    {allUsers.filter((user: any) => 
                      user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      user.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      user.lastName?.toLowerCase().includes(userSearch.toLowerCase())
                    ).map((user: any) => (
                      <Card key={user.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="text-white">
                              <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                              <p className="text-sm text-white/70">{user.email}</p>
                              <p className="text-sm">Credits: ${user.credits}</p>
                              <p className="text-sm">Loyalty Points: {user.loyaltyPoints}</p>
                            </div>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const amount = prompt("Enter credit amount to add:");
                                  if (amount) {
                                    updateCreditsMutation.mutate({ userId: user.id, amount });
                                  }
                                }}
                              >
                                Add Credits
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const points = prompt("Enter points to add:");
                                  if (points) {
                                    updatePointsMutation.mutate({ userId: user.id, points: parseInt(points) });
                                  }
                                }}
                              >
                                Add Points
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Transaction Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search transactions..."
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                  />
                  
                  <div className="grid gap-4">
                    {(allTransactions as any[]).filter((transaction: any) => 
                      transaction.description?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                      transaction.amount?.toString().includes(transactionSearch)
                    ).map((transaction: any) => (
                      <Card key={transaction.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="text-white">
                              <h3 className="font-semibold">{transaction.description}</h3>
                              <p className="text-sm text-white/70">Amount: ${transaction.amount}</p>
                              <p className="text-sm">Status: {transaction.status}</p>
                              <p className="text-sm">Date: {new Date(transaction.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                              {transaction.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cashouts">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Cash Out Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Search cash out requests..."
                    value={cashOutSearch}
                    onChange={(e) => setCashOutSearch(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                  />
                  
                  <div className="grid gap-4">
                    {(cashOutRequests as any[]).filter((request: any) => 
                      request.amount?.toString().includes(cashOutSearch) ||
                      request.status?.toLowerCase().includes(cashOutSearch.toLowerCase())
                    ).map((request: any) => (
                      <Card key={request.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="text-white">
                              <h3 className="font-semibold">Cash Out Request #{request.id}</h3>
                              <p className="text-sm text-white/70">Amount: ${request.amount}</p>
                              <p className="text-sm">Status: {request.status}</p>
                              <p className="text-sm">Date: {new Date(request.createdAt).toLocaleDateString()}</p>
                              {request.adminNotes && (
                                <p className="text-sm text-blue-300">Admin Notes: {request.adminNotes}</p>
                              )}
                            </div>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const notes = prompt("Enter admin notes (optional):");
                                  updateCashOutMutation.mutate({ 
                                    id: request.id, 
                                    status: 'approved',
                                    adminNotes: notes || undefined
                                  });
                                }}
                                disabled={request.status !== 'pending'}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  const notes = prompt("Enter rejection reason:");
                                  if (notes) {
                                    updateCashOutMutation.mutate({ 
                                      id: request.id, 
                                      status: 'rejected',
                                      adminNotes: notes
                                    });
                                  }
                                }}
                                disabled={request.status !== 'pending'}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="toys">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">All Toys Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {(allToys as any[]).map((toy: any) => (
                    <Card key={toy.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="text-white">
                            <h3 className="font-semibold">{toy.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge className={getRarityColor(toy.rarity)}>
                                {toy.rarity}
                              </Badge>
                              <Badge className={getGenderColor(toy.gender)}>
                                {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                              </Badge>
                              <Badge variant="outline" className="text-white border-white/30">
                                {toy.color}
                              </Badge>
                            </div>
                            <p className="text-sm text-white/70 mt-1">
                              Owner: {toy.owner ? `${toy.owner.firstName} ${toy.owner.lastName}` : 'No Owner'}
                            </p>
                            <p className="text-sm text-white/70">
                              Toy ID: {toy.id}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this toy?")) {
                                deleteToyMutation.mutate(toy.id);
                              }
                            }}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {allToys.length === 0 && (
                  <div className="text-center py-8 text-white/70">
                    No toys found in the system.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="templates">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-white">
                  Template Toys Management
                  <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template Toy
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white text-black">
                      <DialogHeader>
                        <DialogTitle>Create Template Toy</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            value={templateToyForm.name}
                            onChange={(e) => setTemplateToyForm({...templateToyForm, name: e.target.value})}
                            placeholder="Enter toy name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="season">Season *</Label>
                          <Select
                            value={templateToyForm.seasonId}
                            onValueChange={(value) => setTemplateToyForm({...templateToyForm, seasonId: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select season" />
                            </SelectTrigger>
                            <SelectContent>
                              {((seasons as any) || []).map((season: any) => (
                                <SelectItem key={season.id} value={season.id.toString()}>
                                  {season.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="rarity">Rarity</Label>
                          <Select
                            value={templateToyForm.rarity}
                            onValueChange={(value) => setTemplateToyForm({...templateToyForm, rarity: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Common</SelectItem>
                              <SelectItem value="uncommon">Uncommon</SelectItem>
                              <SelectItem value="rare">Rare</SelectItem>
                              <SelectItem value="epic">Epic</SelectItem>
                              <SelectItem value="legendary">Legendary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="color">Color</Label>
                          <Select
                            value={templateToyForm.color}
                            onValueChange={(value) => setTemplateToyForm({...templateToyForm, color: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blue">Blue</SelectItem>
                              <SelectItem value="red">Red</SelectItem>
                              <SelectItem value="green">Green</SelectItem>
                              <SelectItem value="yellow">Yellow</SelectItem>
                              <SelectItem value="purple">Purple</SelectItem>
                              <SelectItem value="pink">Pink</SelectItem>
                              <SelectItem value="orange">Orange</SelectItem>
                              <SelectItem value="black">Black</SelectItem>
                              <SelectItem value="white">White</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={templateToyForm.gender}
                            onValueChange={(value) => setTemplateToyForm({...templateToyForm, gender: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="imageUrl">Image URL</Label>
                          <Input
                            id="imageUrl"
                            value={templateToyForm.imageUrl}
                            onChange={(e) => setTemplateToyForm({...templateToyForm, imageUrl: e.target.value})}
                            placeholder="Enter image URL"
                          />
                        </div>

                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={templateToyForm.quantity}
                            onChange={(e) => setTemplateToyForm({...templateToyForm, quantity: parseInt(e.target.value) || 1})}
                          />
                        </div>

                        <Button
                          onClick={handleTemplateSubmit}
                          disabled={createTemplateToyMutation.isPending}
                          className="w-full"
                        >
                          {createTemplateToyMutation.isPending ? "Creating..." : "Create Template Toy"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {templateToys.map((toy: any) => (
                    <Card key={toy.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                      <CardContent className="p-4">
                        <div className="text-white">
                          <h3 className="font-semibold">{toy.name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className={getRarityColor(toy.rarity)}>
                              {toy.rarity}
                            </Badge>
                            <Badge className={getGenderColor(toy.gender)}>
                              {toy.gender === 'male' ? '♂ Male' : '♀ Female'}
                            </Badge>
                            <Badge variant="outline" className="text-white border-white/30">
                              {toy.color}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/70 mt-1">
                            Season: {toy.season?.displayName || 'Unknown'}
                          </p>
                          <p className="text-sm text-white/70">
                            Template ID: {toy.id}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {templateToys.length === 0 && (
                  <div className="text-center py-8 text-white/70">
                    No template toys found. Create your first template toy to get started.
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