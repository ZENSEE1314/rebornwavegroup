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

        {/* Company Profile Section - Prominent Display */}
        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to RebornWave Group</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your premier destination for digital pet care, entertainment services, and innovative financial management
            </p>
          </div>

          {/* Main Company Profile Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 max-w-6xl mx-auto mb-8">
            <CardHeader className="text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl text-gray-900">RebornWave Group</CardTitle>
              <CardDescription className="text-lg text-gray-700">
                Comprehensive Digital Financial Management Platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  RebornWave Group is a revolutionary digital platform that combines advanced gamification, 
                  interactive pet care experiences, and robust user engagement technologies. We offer a unique 
                  blend of virtual pet management, collectible marketplace transactions, real-world service bookings, 
                  and comprehensive financial management tools.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <PawPrint className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Digital Pet Care</h3>
                  <p className="text-sm text-gray-600">Interactive virtual pets with real-time stat tracking and automated care systems</p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <ShoppingCart className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">NFT Marketplace</h3>
                  <p className="text-sm text-gray-600">Buy and sell collectible toys with QR code activation and blockchain verification</p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <Calendar className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Service Bookings</h3>
                  <p className="text-sm text-gray-600">Beauty treatments, entertainment venues, and restaurant reservations</p>
                </div>
                <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <Users className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Referral System</h3>
                  <p className="text-sm text-gray-600">Earn commissions through our multi-level referral program and loyalty rewards</p>
                </div>
              </div>

              {/* Company Values */}
              <div className="bg-white rounded-lg p-6 mt-8">
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">Our Core Values</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Star className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 mb-2">Innovation</h4>
                    <p className="text-sm text-gray-600">Cutting-edge technology meets user-friendly design</p>
                  </div>
                  <div className="text-center">
                    <Crown className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 mb-2">Excellence</h4>
                    <p className="text-sm text-gray-600">Premium quality services and experiences</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 mb-2">Growth</h4>
                    <p className="text-sm text-gray-600">Empowering users to build wealth and achieve success</p>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center pt-6">
                <p className="text-lg text-gray-700 mb-4">
                  Join thousands of users who are already earning rewards and managing their digital assets with RebornWave Group
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 px-4 py-2">
                    🏆 Premium Platform
                  </Badge>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 px-4 py-2">
                    💰 Earn Real Rewards
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-4 py-2">
                    🔒 Secure & Trusted
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}