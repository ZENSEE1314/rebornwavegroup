import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, DollarSign, Calendar, Gift, Home, User, LogOut,
  Heart, Droplets, Bed, Sparkles
} from "lucide-react";

interface UserStats {
  credits?: string;
  loyaltyPoints?: number;
  referrals?: any[];
}

interface Pet {
  id: number;
  name: string;
  growthStage: string;
  happiness: number;
  hunger: number;
  cleanliness?: number;
  energy?: number;
}

interface User {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export default function CompleteApp() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Type the user object
  const typedUser = user as User | undefined;

  // Fetch user stats
  const { data: userStats = {} } = useQuery({
    queryKey: ['/api/user/stats'],
  });
  const typedUserStats = userStats as UserStats;

  // Fetch pets
  const { data: pets = [] } = useQuery({
    queryKey: ['/api/pets'],
  });
  const typedPets = pets as Pet[];

  const navigation = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "petcare", label: "Pet Care", icon: Heart },
    { id: "marketplace", label: "Marketplace", icon: DollarSign },
    { id: "loyalty", label: "Loyalty", icon: Gift },
    { id: "profile", label: "Profile", icon: User }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">RW</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Reborn Wave Group</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {typedUser?.firstName || typedUser?.email}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors duration-200 ${
                    activeTab === item.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typedUserStats.credits || "0"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typedUserStats.loyaltyPoints || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Pets</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typedPets.length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typedUserStats.referrals?.length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No recent activity to display</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "petcare" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Pet Care</h2>
            
            {typedPets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typedPets.map((pet) => (
                  <Card key={pet.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{pet.name}</span>
                        <Badge variant="outline">{pet.growthStage}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Happiness</span>
                          <span>{pet.happiness}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${pet.happiness}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Hunger</span>
                          <span>{pet.hunger}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full" 
                            style={{ width: `${pet.hunger}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" />
                          <span>Play</span>
                        </Button>
                        <Button size="sm" className="flex items-center space-x-1">
                          <Droplets className="w-4 h-4" />
                          <span>Feed</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Heart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Pets Yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start your collection by scanning QR codes or visiting the marketplace
                  </p>
                  <Button onClick={() => setActiveTab("marketplace")}>
                    Visit Marketplace
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "marketplace" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Marketplace</h2>
            <Card>
              <CardContent className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Marketplace Coming Soon
                </h3>
                <p className="text-gray-500">
                  Buy and sell digital collectibles with other users
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Loyalty Program</h2>
            <Card>
              <CardContent className="text-center py-12">
                <Gift className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Loyalty Rewards
                </h3>
                <p className="text-gray-500 mb-4">
                  Current Points: {typedUserStats.loyaltyPoints || 0}
                </p>
                <p className="text-gray-500">
                  Redeem points for exclusive rewards and benefits
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{typedUser?.email}</p>
                </div>
                {typedUser?.firstName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{typedUser.firstName}</p>
                  </div>
                )}
                {typedUser?.lastName && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <p className="mt-1 text-sm text-gray-900">{typedUser.lastName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}