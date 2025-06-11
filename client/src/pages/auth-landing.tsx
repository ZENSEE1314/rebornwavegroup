import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, PawPrint, ShoppingCart, Calendar, Users, Crown, TrendingUp, ArrowRight } from "lucide-react";

export default function AuthLanding() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-2xl">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent mb-6">
            RebornWave Group
          </h1>
          <p className="text-xl text-purple-200 max-w-4xl mx-auto leading-relaxed">
            Comprehensive Digital Financial Management Platform combining advanced gamification, 
            interactive pet care experiences, and robust user engagement technologies
          </p>
        </div>

        {/* Features Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <PawPrint className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Digital Pet Care</h3>
              <p className="text-sm text-purple-200">Interactive virtual pets with real-time stat tracking and automated care systems</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">NFT Marketplace</h3>
              <p className="text-sm text-purple-200">Buy and sell collectible toys with QR code activation and blockchain verification</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Service Bookings</h3>
              <p className="text-sm text-purple-200">Beauty treatments, entertainment venues, and restaurant reservations</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Referral System</h3>
              <p className="text-sm text-purple-200">Earn commissions through our multi-level referral program and loyalty rewards</p>
            </CardContent>
          </Card>
        </div>

        {/* Company Values */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10 mb-16">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold text-center text-white mb-12">Why Choose RebornWave Group?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Innovation</h3>
                <p className="text-purple-200 text-lg">Cutting-edge technology meets user-friendly design in our revolutionary platform</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Excellence</h3>
                <p className="text-purple-200 text-lg">Premium quality services and experiences that exceed expectations</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Growth</h3>
                <p className="text-purple-200 text-lg">Empowering users to build wealth and achieve financial success</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Section */}
        <Card className="bg-white/5 backdrop-blur-md border-white/10 mb-16">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold text-center text-white mb-12">What You Get When You Join</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Virtual Pet Management</h4>
                    <p className="text-purple-200">Care for interactive digital pets that evolve and grow with your attention</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Earn Real Rewards</h4>
                    <p className="text-purple-200">Generate income through gameplay, referrals, and marketplace transactions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Secure Transactions</h4>
                    <p className="text-purple-200">Safe and encrypted payment processing for all your transactions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Premium Services</h4>
                    <p className="text-purple-200">Access to exclusive beauty, entertainment, and dining experiences</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Commission System</h4>
                    <p className="text-purple-200">Earn 10% commissions when you refer friends to the platform</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Loyalty Program</h4>
                    <p className="text-purple-200">Accumulate points and redeem them for valuable rewards and services</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">24/7 Support</h4>
                    <p className="text-purple-200">Round-the-clock customer service to assist with any questions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white mb-2">Mobile Optimized</h4>
                    <p className="text-purple-200">Full functionality across all devices with responsive design</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Digital Experience?</h2>
            <p className="text-xl text-purple-200 max-w-2xl mx-auto">
              Join thousands of users who are already earning rewards and managing their digital assets with RebornWave Group
            </p>
          </div>
          
          <Link href="/login">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl font-semibold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Access Platform
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
          
          <div className="mt-8 flex justify-center space-x-8">
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
              <span className="text-purple-200 text-sm">🏆 Premium Platform</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
              <span className="text-purple-200 text-sm">💰 Earn Real Rewards</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
              <span className="text-purple-200 text-sm">🔒 Secure & Trusted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}