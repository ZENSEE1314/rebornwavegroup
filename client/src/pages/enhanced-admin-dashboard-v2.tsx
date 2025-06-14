import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, DollarSign, ShoppingCart, Package, Database, BarChart3, Settings, Plus, Trash2, Edit, Star, Zap, Crown, Sparkles, Coffee, Users2, Eye, Gift } from "lucide-react";

function EnhancedAdminDashboardV2() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Season/Sector Management State
  const [newSeason, setNewSeason] = useState({ name: "", displayName: "", color: "#8B5CF6" });
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [newSector, setNewSector] = useState({ name: "", displayName: "", color: "#10B981", seasonId: null as number | null });
  const [editingSector, setEditingSector] = useState<any>(null);

  // Bulk Toy Generation State
  const [bulkToyData, setBulkToyData] = useState({
    baseName: "",
    quantity: 10,
    rarity: "common",
    color: "blue",
    seasonId: null as number | null,
    sectorId: null as number | null,
    imageUrl: "",
    toyNames: "",
    basePointsCost: 100,
    baseCreditsCost: 10,
    isSeasonalExclusive: false
  });

  // API Queries
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

  const { data: seasonsResponse, refetch: refetchSeasons } = useQuery({
    queryKey: ['/api/admin/seasons'],
    enabled: activeTab === 'seasons'
  });

  const { data: sectorsResponse, refetch: refetchSectors } = useQuery({
    queryKey: ['/api/admin/sectors'],
    enabled: activeTab === 'seasons'
  });

  // Safe data access
  const usersData = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  const toysData = Array.isArray(toysResponse?.data) ? toysResponse.data : [];
  const transactionsData = Array.isArray(transactionsResponse?.data) ? transactionsResponse.data : [];
  const seasonsData = Array.isArray(seasonsResponse) ? seasonsResponse : [];
  const sectorsData = Array.isArray(sectorsResponse) ? sectorsResponse : [];

  // Mutations
  const createSeasonMutation = useMutation({
    mutationFn: async (seasonData: any) => {
      const response = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seasonData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Season created successfully" });
      setNewSeason({ name: "", displayName: "", color: "#8B5CF6" });
      refetchSeasons();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create season", variant: "destructive" });
    }
  });

  const updateSeasonMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/admin/seasons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Season updated successfully" });
      setEditingSeason(null);
      refetchSeasons();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update season", variant: "destructive" });
    }
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/seasons/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Season deleted successfully" });
      refetchSeasons();
      refetchSectors();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete season", variant: "destructive" });
    }
  });

  const createSectorMutation = useMutation({
    mutationFn: async (sectorData: any) => {
      const response = await fetch('/api/admin/sectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectorData)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sector created successfully" });
      setNewSector({ name: "", displayName: "", color: "#10B981", seasonId: null });
      refetchSectors();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create sector", variant: "destructive" });
    }
  });

  const updateSectorMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/admin/sectors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sector updated successfully" });
      setEditingSector(null);
      refetchSectors();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update sector", variant: "destructive" });
    }
  });

  const deleteSectorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sectors/${id}`, { method: 'DELETE' });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sector deleted successfully" });
      refetchSectors();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete sector", variant: "destructive" });
    }
  });

  const bulkCreateToysMutation = useMutation({
    mutationFn: async (toyData: any) => {
      const response = await fetch('/api/admin/bulk-create-toys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toyData)
      });
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({ 
        title: "Success", 
        description: `Created ${response?.toysCreated || bulkToyData.quantity} toys successfully` 
      });
      setBulkToyData({
        baseName: "",
        quantity: 10,
        rarity: "common",
        color: "blue",
        seasonId: null,
        sectorId: null,
        imageUrl: "",
        toyNames: "",
        basePointsCost: 100,
        baseCreditsCost: 10,
        isSeasonalExclusive: false
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/all-toys'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create toys", variant: "destructive" });
    }
  });

  const handleCreateSeason = () => {
    if (!newSeason.name || !newSeason.displayName) {
      toast({ title: "Error", description: "Please fill in all season fields", variant: "destructive" });
      return;
    }
    createSeasonMutation.mutate(newSeason);
  };

  const handleUpdateSeason = () => {
    if (!editingSeason) return;
    updateSeasonMutation.mutate(editingSeason);
  };

  const handleCreateSector = () => {
    if (!newSector.name || !newSector.displayName || !newSector.seasonId) {
      toast({ title: "Error", description: "Please fill in all sector fields", variant: "destructive" });
      return;
    }
    createSectorMutation.mutate(newSector);
  };

  const handleUpdateSector = () => {
    if (!editingSector) return;
    updateSectorMutation.mutate(editingSector);
  };

  const handleBulkCreateToys = () => {
    if (!bulkToyData.baseName) {
      toast({ title: "Error", description: "Please provide a base name for the toys", variant: "destructive" });
      return;
    }
    bulkCreateToysMutation.mutate(bulkToyData);
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'epic': return <Star className="h-4 w-4 text-purple-400" />;
      case 'rare': return <Zap className="h-4 w-4 text-blue-400" />;
      case 'secret': return <Sparkles className="h-4 w-4 text-pink-400" />;
      default: return <Coffee className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'epic': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'secret': return 'bg-pink-500/20 text-pink-400 border-pink-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enhanced Admin Dashboard</h1>
          <p className="text-gray-300">Complete administrative control with advanced management features</p>
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

          {/* Enhanced Toys Tab with Bulk Generation */}
          <TabsContent value="toys">
            <div className="space-y-6">
              {/* Toy Statistics */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Toy Management Dashboard
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Advanced toy inventory management and bulk generation tools</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

                  {/* Bulk Toy Generation */}
                  <div className="border-t border-white/20 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Bulk Toy Generation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="baseName" className="text-gray-300">Base Name</Label>
                        <Input
                          id="baseName"
                          value={bulkToyData.baseName}
                          onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, baseName: e.target.value }))}
                          placeholder="e.g., Dragon Plushie"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity" className="text-gray-300">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={bulkToyData.quantity}
                          onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          min="1"
                          max="100"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rarity" className="text-gray-300">Rarity</Label>
                        <Select value={bulkToyData.rarity} onValueChange={(value) => setBulkToyData((prev: any) => ({ ...prev, rarity: value }))}>
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
                        <Label htmlFor="color" className="text-gray-300">Color</Label>
                        <Select value={bulkToyData.color} onValueChange={(value) => setBulkToyData((prev: any) => ({ ...prev, color: value }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="red">Red</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="yellow">Yellow</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="pink">Pink</SelectItem>
                            <SelectItem value="orange">Orange</SelectItem>
                            <SelectItem value="black">Black</SelectItem>
                            <SelectItem value="white">White</SelectItem>
                            <SelectItem value="gray">Gray</SelectItem>
                            <SelectItem value="rainbow">Rainbow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="season" className="text-gray-300">Season (Optional)</Label>
                        <Select value={bulkToyData.seasonId?.toString() || ""} onValueChange={(value) => setBulkToyData((prev: any) => ({ ...prev, seasonId: value ? parseInt(value) : null }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Season</SelectItem>
                            {seasonsData.map((season: any) => (
                              <SelectItem key={season.id} value={season.id.toString()}>
                                {season.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="sector" className="text-gray-300">Sector (Optional)</Label>
                        <Select value={bulkToyData.sectorId?.toString() || ""} onValueChange={(value) => setBulkToyData((prev: any) => ({ ...prev, sectorId: value ? parseInt(value) : null }))}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No Sector</SelectItem>
                            {sectorsData.map((sector: any) => (
                              <SelectItem key={sector.id} value={sector.id.toString()}>
                                {sector.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="pointsCost" className="text-gray-300">Base Points Cost</Label>
                        <Input
                          id="pointsCost"
                          type="number"
                          value={bulkToyData.basePointsCost}
                          onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, basePointsCost: parseInt(e.target.value) || 0 }))}
                          min="0"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="creditsCost" className="text-gray-300">Base Credits Cost</Label>
                        <Input
                          id="creditsCost"
                          type="number"
                          value={bulkToyData.baseCreditsCost}
                          onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, baseCreditsCost: parseInt(e.target.value) || 0 }))}
                          min="0"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id="seasonal"
                          checked={bulkToyData.isSeasonalExclusive}
                          onCheckedChange={(checked) => setBulkToyData((prev: any) => ({ ...prev, isSeasonalExclusive: checked }))}
                        />
                        <Label htmlFor="seasonal" className="text-gray-300">Seasonal Exclusive</Label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="imageUrl" className="text-gray-300">Image URL</Label>
                      <Input
                        id="imageUrl"
                        value={bulkToyData.imageUrl}
                        onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://example.com/toy-image.png"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="toyNames" className="text-gray-300">Custom Names (Optional)</Label>
                      <Textarea
                        id="toyNames"
                        value={bulkToyData.toyNames}
                        onChange={(e) => setBulkToyData((prev: any) => ({ ...prev, toyNames: e.target.value }))}
                        placeholder="Enter custom names separated by commas (optional)"
                        className="bg-white/10 border-white/20 text-white"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleBulkCreateToys}
                      disabled={bulkCreateToysMutation.isPending}
                      className="mt-4 bg-purple-600 hover:bg-purple-700"
                    >
                      {bulkCreateToysMutation.isPending ? "Creating..." : `Create ${bulkToyData.quantity} Toys`}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Toys List */}
              {toysData.length > 0 && (
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Existing Toys</CardTitle>
                    <p className="text-gray-300 text-sm">Current toy inventory overview</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {toysData.slice(0, 12).map((toy: any) => (
                        <div key={toy.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white font-medium truncate">{toy.name}</h4>
                            <Badge className={`${getRarityColor(toy.rarity)} text-xs`}>
                              {getRarityIcon(toy.rarity)}
                              <span className="ml-1">{toy.rarity}</span>
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div>ID: {toy.id}</div>
                            {toy.owner && <div>Owner: {toy.owner}</div>}
                            <div>Points: {toy.pointsCost} | Credits: {toy.creditsCost}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {toysData.length > 12 && (
                      <div className="text-center mt-4 text-gray-400 text-sm">
                        And {toysData.length - 12} more toys...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Enhanced Seasons Tab with Full Management */}
          <TabsContent value="seasons">
            <div className="space-y-6">
              {/* Season Management */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Season Management
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Create and manage seasonal collections with custom colors</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <Label htmlFor="seasonName" className="text-gray-300">Season Name</Label>
                      <Input
                        id="seasonName"
                        value={newSeason.name}
                        onChange={(e) => setNewSeason(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., winter_2024"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="seasonDisplayName" className="text-gray-300">Display Name</Label>
                      <Input
                        id="seasonDisplayName"
                        value={newSeason.displayName}
                        onChange={(e) => setNewSeason(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="e.g., Winter Collection 2024"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="seasonColor" className="text-gray-300">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="seasonColor"
                          type="color"
                          value={newSeason.color}
                          onChange={(e) => setNewSeason(prev => ({ ...prev, color: e.target.value }))}
                          className="w-16 h-10 bg-white/10 border-white/20"
                        />
                        <Input
                          value={newSeason.color}
                          onChange={(e) => setNewSeason(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="#8B5CF6"
                          className="flex-1 bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateSeason}
                    disabled={createSeasonMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 mb-6"
                  >
                    {createSeasonMutation.isPending ? "Creating..." : "Create Season"}
                  </Button>

                  {/* Existing Seasons */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Existing Seasons</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {seasonsData.map((season: any) => (
                        <div key={season.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: season.color }}
                              />
                              <h4 className="text-white font-medium">{season.displayName}</h4>
                            </div>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingSeason(season)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 border-gray-700">
                                  <DialogHeader>
                                    <DialogTitle className="text-white">Edit Season</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-gray-300">Season Name</Label>
                                      <Input
                                        value={editingSeason?.name || ""}
                                        onChange={(e) => setEditingSeason(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-white/10 border-white/20 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Display Name</Label>
                                      <Input
                                        value={editingSeason?.displayName || ""}
                                        onChange={(e) => setEditingSeason(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="bg-white/10 border-white/20 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-gray-300">Color</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          type="color"
                                          value={editingSeason?.color || "#8B5CF6"}
                                          onChange={(e) => setEditingSeason(prev => ({ ...prev, color: e.target.value }))}
                                          className="w-16 h-10 bg-white/10 border-white/20"
                                        />
                                        <Input
                                          value={editingSeason?.color || "#8B5CF6"}
                                          onChange={(e) => setEditingSeason(prev => ({ ...prev, color: e.target.value }))}
                                          className="flex-1 bg-white/10 border-white/20 text-white"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      onClick={handleUpdateSeason}
                                      disabled={updateSeasonMutation.isPending}
                                      className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                      {updateSeasonMutation.isPending ? "Updating..." : "Update Season"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-gray-900 border-gray-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Delete Season</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-300">
                                      Are you sure you want to delete "{season.displayName}"? This will also delete all associated sectors and may affect toys in this season.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteSeasonMutation.mutate(season.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {season.id} | Name: {season.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sector Management */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Sector Management
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Create and manage sectors within seasons</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <Label htmlFor="sectorSeason" className="text-gray-300">Season</Label>
                      <Select value={newSector.seasonId?.toString() || ""} onValueChange={(value) => setNewSector(prev => ({ ...prev, seasonId: parseInt(value) }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select season" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasonsData.map((season: any) => (
                            <SelectItem key={season.id} value={season.id.toString()}>
                              {season.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sectorName" className="text-gray-300">Sector Name</Label>
                      <Input
                        id="sectorName"
                        value={newSector.name}
                        onChange={(e) => setNewSector(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., rare_finds"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectorDisplayName" className="text-gray-300">Display Name</Label>
                      <Input
                        id="sectorDisplayName"
                        value={newSector.displayName}
                        onChange={(e) => setNewSector(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="e.g., Rare Finds"
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sectorColor" className="text-gray-300">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sectorColor"
                          type="color"
                          value={newSector.color}
                          onChange={(e) => setNewSector(prev => ({ ...prev, color: e.target.value }))}
                          className="w-16 h-10 bg-white/10 border-white/20"
                        />
                        <Input
                          value={newSector.color}
                          onChange={(e) => setNewSector(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="#10B981"
                          className="flex-1 bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateSector}
                    disabled={createSectorMutation.isPending || !newSector.seasonId}
                    className="bg-green-600 hover:bg-green-700 mb-6"
                  >
                    {createSectorMutation.isPending ? "Creating..." : "Create Sector"}
                  </Button>

                  {/* Existing Sectors */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Existing Sectors</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sectorsData.map((sector: any) => {
                        const parentSeason = seasonsData.find((s: any) => s.id === sector.seasonId);
                        return (
                          <div key={sector.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: sector.color }}
                                />
                                <h4 className="text-white font-medium">{sector.displayName}</h4>
                              </div>
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingSector(sector)}
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-gray-900 border-gray-700">
                                    <DialogHeader>
                                      <DialogTitle className="text-white">Edit Sector</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-gray-300">Season</Label>
                                        <Select value={editingSector?.seasonId?.toString() || ""} onValueChange={(value) => setEditingSector(prev => ({ ...prev, seasonId: parseInt(value) }))}>
                                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {seasonsData.map((season: any) => (
                                              <SelectItem key={season.id} value={season.id.toString()}>
                                                {season.displayName}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-gray-300">Sector Name</Label>
                                        <Input
                                          value={editingSector?.name || ""}
                                          onChange={(e) => setEditingSector(prev => ({ ...prev, name: e.target.value }))}
                                          className="bg-white/10 border-white/20 text-white"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-gray-300">Display Name</Label>
                                        <Input
                                          value={editingSector?.displayName || ""}
                                          onChange={(e) => setEditingSector(prev => ({ ...prev, displayName: e.target.value }))}
                                          className="bg-white/10 border-white/20 text-white"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-gray-300">Color</Label>
                                        <div className="flex gap-2">
                                          <Input
                                            type="color"
                                            value={editingSector?.color || "#10B981"}
                                            onChange={(e) => setEditingSector(prev => ({ ...prev, color: e.target.value }))}
                                            className="w-16 h-10 bg-white/10 border-white/20"
                                          />
                                          <Input
                                            value={editingSector?.color || "#10B981"}
                                            onChange={(e) => setEditingSector(prev => ({ ...prev, color: e.target.value }))}
                                            className="flex-1 bg-white/10 border-white/20 text-white"
                                          />
                                        </div>
                                      </div>
                                      <Button
                                        onClick={handleUpdateSector}
                                        disabled={updateSectorMutation.isPending}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                      >
                                        {updateSectorMutation.isPending ? "Updating..." : "Update Sector"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-gray-900 border-gray-700">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-white">Delete Sector</AlertDialogTitle>
                                      <AlertDialogDescription className="text-gray-300">
                                        Are you sure you want to delete "{sector.displayName}"? This may affect toys in this sector.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteSectorMutation.mutate(sector.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              <div>ID: {sector.id} | Name: {sector.name}</div>
                              <div>Season: {parentSeason?.displayName || 'Unknown'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Other tabs remain the same */}
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

export default EnhancedAdminDashboardV2;