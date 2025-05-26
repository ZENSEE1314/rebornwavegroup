import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Store, Plus, MessageCircle, Star, QrCode } from "lucide-react";

export default function Marketplace() {
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedToyId, setSelectedToyId] = useState("");
  const [listingData, setListingData] = useState({
    price: "",
    description: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allListings, isLoading: listingsLoading } = useQuery({
    queryKey: ["/api/marketplace/listings"],
  });

  const { data: myListings, isLoading: myListingsLoading } = useQuery({
    queryKey: ["/api/marketplace/my-listings"],
  });

  const { data: myToys } = useQuery({
    queryKey: ["/api/toys"],
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/marketplace/listings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Listing created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      setIsCreateListingOpen(false);
      setListingData({ price: "", description: "" });
      setSelectedToyId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    },
  });

  const scanQRMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      return await apiRequest("POST", "/api/toys/scan", { qrCode });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/toys"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scan QR code",
        variant: "destructive",
      });
    },
  });

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToyId) {
      toast({
        title: "Error",
        description: "Please select a toy to list",
        variant: "destructive",
      });
      return;
    }

    createListingMutation.mutate({
      toyId: parseInt(selectedToyId),
      price: listingData.price,
      description: listingData.description,
    });
  };

  const handleScanQR = () => {
    const qrCode = prompt("Enter QR Code:");
    if (qrCode) {
      scanQRMutation.mutate(qrCode);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-slate-100 text-slate-800';
      case 'rare':
        return 'bg-blue-100 text-blue-800';
      case 'ultra_rare':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (listingsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Marketplace</h1>
        <div className="flex space-x-4">
          <Button onClick={handleScanQR} variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR Code
          </Button>
          <Dialog open={isCreateListingOpen} onOpenChange={setIsCreateListingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Listing</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateListing} className="space-y-4">
                <div>
                  <Label htmlFor="toy">Select Toy</Label>
                  <select
                    id="toy"
                    value={selectedToyId}
                    onChange={(e) => setSelectedToyId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-md"
                    required
                  >
                    <option value="">Select a toy</option>
                    {myToys?.filter((toy: any) => !toy.isForSale).map((toy: any) => (
                      <option key={toy.id} value={toy.id}>
                        {toy.name} - {toy.series} ({toy.rarity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={listingData.price}
                    onChange={(e) => setListingData({ ...listingData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={listingData.description}
                    onChange={(e) => setListingData({ ...listingData, description: e.target.value })}
                    placeholder="Describe the condition and any special features..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createListingMutation.isPending}>
                  {createListingMutation.isPending ? "Creating..." : "Create Listing"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Listings</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
          <TabsTrigger value="my-collection">My Collection</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allListings && allListings.length > 0 ? (
              allListings.map((listing: any) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">{listing.toy?.name || 'Unknown Toy'}</h3>
                      <Badge className={getRarityColor(listing.toy?.rarity || 'common')}>
                        {listing.toy?.rarity || 'common'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">Series: {listing.toy?.series || 'Unknown'}</p>
                    
                    {listing.description && (
                      <p className="text-sm text-slate-700 mb-4">{listing.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">${listing.price}</span>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Chat
                        </Button>
                        <Button size="sm">
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No listings available</p>
                <p className="text-sm">Be the first to list a collectible!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-listings">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings && myListings.length > 0 ? (
              myListings.map((listing: any) => (
                <Card key={listing.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">{listing.toy?.name || 'Unknown Toy'}</h3>
                      <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                        {listing.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">Series: {listing.toy?.series || 'Unknown'}</p>
                    
                    {listing.description && (
                      <p className="text-sm text-slate-700 mb-4">{listing.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary-600">${listing.price}</span>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active listings</p>
                <p className="text-sm">Create your first listing to start selling!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-collection">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myToys && myToys.length > 0 ? (
              myToys.map((toy: any) => (
                <Card key={toy.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">{toy.name}</h3>
                      <Badge className={getRarityColor(toy.rarity)}>
                        {toy.rarity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2">Series: {toy.series}</p>
                    <p className="text-sm text-slate-500 mb-4">QR: {toy.qrCode}</p>
                    
                    {toy.isForSale ? (
                      <Badge variant="secondary">Listed for Sale</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full">
                        List for Sale
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-500">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No collectibles yet</p>
                <p className="text-sm">Scan QR codes to add toys to your collection!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
