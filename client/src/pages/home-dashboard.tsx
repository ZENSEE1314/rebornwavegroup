import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Home, 
  PawPrint, 
  ShoppingCart, 
  Calendar, 
  Users, 
  Gift, 
  TrendingUp,
  Sparkles,
  Crown,
  Star
} from "lucide-react";

export default function HomeDashboard() {
  const { user } = useAuth();
  
  const { data: userStats } = useQuery({
    queryKey: ["/api/user-stats"],
  });

  const { data: pets } = useQuery({
    queryKey: ["/api/pets"],
  });

  const { data: pendingPurchases } = useQuery({
    queryKey: ["/api/pending-purchases"],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">RebornWave Group</h1>
                <p className="text-sm text-gray-600">Digital Pet Care Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <Crown className="w-3 h-3 mr-1" />
                Premium Member
              </Badge>
              <Link href="/api/logout">
                <Button variant="outline" size="sm">Logout</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'User'}! 👋
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage your digital pets, explore the marketplace, and earn rewards in your personalized dashboard.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Credits</p>
                  <p className="text-2xl font-bold text-green-600">
                    RP {userStats?.credits ? parseFloat(userStats.credits).toLocaleString() : '0'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Loyalty Points</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {userStats?.loyaltyPoints || 0}
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Pets</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Array.isArray(pets) ? pets.length : 0}
                  </p>
                </div>
                <PawPrint className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Array.isArray(pendingPurchases) ? pendingPurchases.filter((p: any) => p.status === 'pending').length : 0}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PawPrint className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Pet Care Center</CardTitle>
                    <CardDescription>Care for your digital pets and earn tokens</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Marketplace</CardTitle>
                    <CardDescription>Buy and sell collectible toys</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Bookings</CardTitle>
                    <CardDescription>Schedule beauty and entertainment services</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Referral Program</CardTitle>
                    <CardDescription>Invite friends and earn commissions</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Loyalty Rewards</CardTitle>
                    <CardDescription>Redeem points for exclusive benefits</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/app">
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/80 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Full Application</CardTitle>
                    <CardDescription>Access all features in one place</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Company Info Section */}
        <div className="mt-12 text-center">
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">About RebornWave Group</CardTitle>
              <CardDescription className="text-lg">
                Your premier destination for digital pet care and entertainment services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                RebornWave Group is a comprehensive digital financial management platform that combines advanced 
                gamification, interactive pet care experiences, and robust user engagement technologies. 
                Our platform offers a unique blend of virtual pet management, marketplace transactions, 
                and real-world service bookings.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4">
                  <PawPrint className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Pet Care System</h3>
                  <p className="text-sm text-gray-600">Interactive virtual pets with real-time stat tracking</p>
                </div>
                <div className="text-center p-4">
                  <ShoppingCart className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Marketplace</h3>
                  <p className="text-sm text-gray-600">Buy and sell collectible toys with QR activation</p>
                </div>
                <div className="text-center p-4">
                  <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Service Bookings</h3>
                  <p className="text-sm text-gray-600">Beauty, entertainment, and restaurant services</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}