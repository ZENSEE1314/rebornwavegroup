import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for user management
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [cashOutSearch, setCashOutSearch] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Template toy form state
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

  // Fetch template toys
  const { data: templateToysResponse } = useQuery({
    queryKey: ["/api/admin/template-toys"],
  });
  const templateToys = (templateToysResponse as any)?.data || [];

  // Fetch seasons for template toy creation
  const { data: seasons } = useQuery({
    queryKey: ["/api/seasons"],
  });
  
  // Fetch all users with pagination
  const { data: usersResponse } = useQuery({
    queryKey: ["/api/admin/users"],
  });
  const allUsers = (usersResponse as any)?.data || [];

  // Fetch all cash out requests
  const { data: cashOutRequests = [] } = useQuery({
    queryKey: ["/api/admin/cash-outs"],
  });

  // Fetch all transactions
  const { data: allTransactions = [] } = useQuery({
    queryKey: ["/api/admin/transactions"],
  });

  // Fetch all toys (active toys with owners)
  const { data: allToys = [] } = useQuery({
    queryKey: ["/api/admin/all-toys"],
  });

  // Create template toy mutation
  const createTemplateToyMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest('POST', '/api/admin/toys/create-template', templateData);
    },
    onSuccess: () => {
      toast({ title: "Template toy created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/template-toys'] });
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

  const handleCreateTemplateToy = () => {
    if (!templateToyForm.name || !templateToyForm.seasonId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const templateData = {
      ...templateToyForm,
      seasonId: parseInt(templateToyForm.seasonId),
      quantity: templateToyForm.quantity
    };

    createTemplateToyMutation.mutate(templateData);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500 text-black';
      case 'epic': return 'bg-purple-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      case 'uncommon': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getGenderColor = (gender: string) => {
    return gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Admin Dashboard - Template Toy Management
            </CardTitle>
          </CardHeader>
        </Card>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="templates">Template Toys</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Template Toys Management</CardTitle>
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
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
                        onClick={handleCreateTemplateToy}
                        disabled={createTemplateToyMutation.isPending}
                        className="w-full"
                      >
                        {createTemplateToyMutation.isPending ? "Creating..." : "Create Template Toy"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templateToys.map((toy: any) => (
                    <Card key={toy.id} className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-white">{toy.name}</h3>
                          <div className="flex flex-wrap gap-2">
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
                          <p className="text-sm text-gray-300">
                            Season: {toy.season?.displayName || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-300">
                            Template ID: {toy.id}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {templateToys.length === 0 && (
                  <div className="text-center py-8 text-gray-300">
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