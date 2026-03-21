import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Star, Heart, ShoppingCart, Eye } from "lucide-react";
import MobileBackButton from "@/components/mobile-back-button";

export default function Marketplace() {
  const { toast } = useToast();
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRarity, setFilterRarity] = useState("all");

  const [listings, setListings] = useState([
    {
      id: 1,
      toyName: "Cosmic Dragon",
      series: "Galaxy Collection",
      rarity: "legendary",
      price: 299.99,
      seller: "Candy",
      description: "Limited edition holographic dragon with LED effects. Comes with original packaging and certificate of authenticity.",
      imageUrl: "🐉",
      views: 45,
      likes: 12,
      status: "active"
    },
    {
      id: 2,
      toyName: "Neon Cat",
      series: "Cyberpunk Series",
      rarity: "rare",
      price: 180.00,
      seller: "Zen",
      description: "Glowing cyberpunk cat with color-changing fur. Perfect condition with all original accessories.",
      imageUrl: "🐱",
      views: 32,
      likes: 8,
      status: "active"
    },
    {
      id: 3,
      toyName: "Pixel Bear",
      series: "Retro Gaming",
      rarity: "common",
      price: 65.00,
      seller: "Alex",
      description: "Vintage 8-bit style collectible bear. Classic design in mint condition. Great for collectors!",
      imageUrl: "🧸",
      views: 18,
      likes: 5,
      status: "active"
    }
  ]);

  const myToys = [
    { id: 4, name: "Galaxy Wolf", series: "Space Collection", rarity: "rare", owned: true },
    { id: 5, name: "Crystal Phoenix", series: "Mystic Series", rarity: "legendary", owned: true },
    { id: 6, name: "Thunder Tiger", series: "Storm Collection", rarity: "common", owned: true }
  ];

  const form = useForm({
    defaultValues: { toyId: "", price: "", description: "" },
  });

  const getRarityEmoji = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '⭐';
      case 'rare': return '💎';
      default: return '🎁';
    }
  };

  const onSubmitListing = (data: any) => {
    const selectedToy = myToys.find(toy => toy.id === parseInt(data.toyId));
    if (!selectedToy) return;
    const newListing = {
      id: listings.length + 1,
      toyName: selectedToy.name,
      series: selectedToy.series,
      rarity: selectedToy.rarity,
      price: parseFloat(data.price),
      seller: "Candy",
      description: data.description,
      imageUrl: getRarityEmoji(selectedToy.rarity),
      views: 0,
      likes: 0,
      status: "active"
    };
    setListings([...listings, newListing]);
    toast({ title: "Success!", description: "Your toy has been listed on the marketplace" });
    setIsListingDialogOpen(false);
    form.reset();
  };

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'rare': return 'bg-violet-500/20 text-violet-300 border border-violet-500/30';
      default: return 'bg-white/10 text-white/50 border border-white/20';
    }
  };

  const purchaseToy = (listing: any) => {
    toast({ title: "Purchase Successful!", description: `You bought ${listing.toyName} for $${listing.price}` });
    setListings(listings.map(l => l.id === listing.id ? { ...l, status: "sold" } : l));
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.toyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.series.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRarity = filterRarity === "all" || listing.rarity === filterRarity;
    return matchesSearch && matchesRarity && listing.status === "active";
  });

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <MobileBackButton className="mb-4" />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Collectible Marketplace</h1>
            <p className="text-white/50 mt-1">Buy and sell unique collectible toys</p>
          </div>

          <Dialog open={isListingDialogOpen} onOpenChange={setIsListingDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
                <Plus className="w-5 h-5 mr-2" />
                List Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#14082e] border border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">List Your Collectible</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitListing)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="toyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Select Toy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rwg-input">
                              <SelectValue placeholder="Choose from your collection" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#14082e] border border-white/10 text-white">
                            {myToys.map((toy) => (
                              <SelectItem key={toy.id} value={toy.id.toString()}>
                                {getRarityEmoji(toy.rarity)} {toy.name} - {toy.series}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" className="rwg-input" placeholder="0.00" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Description</FormLabel>
                        <FormControl>
                          <Textarea className="rwg-input" placeholder="Describe your item's condition, accessories, etc." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl" onClick={() => setIsListingDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl">
                      List Item
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
            <Input
              placeholder="Search toys, series, or sellers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rwg-input pl-10"
            />
          </div>
          <Select value={filterRarity} onValueChange={setFilterRarity}>
            <SelectTrigger className="rwg-input w-full md:w-48">
              <SelectValue placeholder="Filter by rarity" />
            </SelectTrigger>
            <SelectContent className="bg-[#14082e] border border-white/10 text-white">
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="legendary">⭐ Legendary</SelectItem>
              <SelectItem value="rare">💎 Rare</SelectItem>
              <SelectItem value="common">🎁 Common</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="rwg-card overflow-hidden hover:border-white/20 transition-colors">
              <div className="aspect-square bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center text-6xl border-b border-white/10">
                {listing.imageUrl}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">{listing.toyName}</h3>
                    <p className="text-sm text-white/50">{listing.series}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${getRarityStyle(listing.rarity)}`}>
                    {listing.rarity}
                  </span>
                </div>

                <p className="text-sm text-white/50 mb-4 line-clamp-2">{listing.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-xl font-bold text-white">${listing.price}</div>
                  <div className="flex items-center space-x-3 text-sm text-white/40">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{listing.views}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{listing.likes}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/40">Seller: {listing.seller}</span>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl"
                    onClick={() => purchaseToy(listing)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Buy Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredListings.length === 0 && (
          <div className="rwg-card text-center py-16">
            <Search className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
            <p className="text-white/50">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
