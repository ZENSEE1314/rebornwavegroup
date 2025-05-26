import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Users, Gift, Calendar, CreditCard, QrCode } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-primary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/>
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-800">Reborn Wave Group</span>
            </div>
            <Button onClick={handleLogin} className="bg-primary-600 hover:bg-primary-700">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Your Complete
            <span className="text-gradient bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent">
              {" "}Business Platform
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Combine appointment booking, loyalty rewards, collectible management, and a powerful 3-level referral system in one comprehensive platform.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg" 
            className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-4"
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything You Need in One Platform
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary-600" />
                </div>
                <CardTitle>Smart Booking System</CardTitle>
                <CardDescription>
                  Easy appointment scheduling with calendar integration and automated reminders.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle>Loyalty Rewards</CardTitle>
                <CardDescription>
                  Earn points with every transaction and unlock exclusive discounts and gifts.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle>3-Level Referrals</CardTitle>
                <CardDescription>
                  Earn up to 15% commission through our comprehensive referral program.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Gift className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Collectible Marketplace</CardTitle>
                <CardDescription>
                  Collect, trade, and sell unique soft toys with QR code verification.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Credit System</CardTitle>
                <CardDescription>
                  Flexible payment system with top-up and cash-out capabilities.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>QR Integration</CardTitle>
                <CardDescription>
                  Scan QR codes to add collectibles to your inventory instantly.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Referral Commission Structure */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-500 to-emerald-500">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-12">Referral Commission Structure</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Direct Referrals</h3>
              <p className="text-3xl font-bold mb-2">10%</p>
              <p className="text-sm opacity-90">Commission on direct referrals</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">2nd Level</h3>
              <p className="text-3xl font-bold mb-2">3%</p>
              <p className="text-sm opacity-90">Commission on 2nd level referrals</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2">3rd Level</h3>
              <p className="text-3xl font-bold mb-2">2%</p>
              <p className="text-sm opacity-90">Commission on 3rd level referrals</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of users who are already earning and growing with Reborn Wave Group.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg" 
            className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-4"
          >
            Start Your Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-lg"></div>
            <span className="font-bold text-slate-800">Reborn Wave Group</span>
          </div>
          <p className="text-slate-600">
            © 2024 Reborn Wave Group. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
