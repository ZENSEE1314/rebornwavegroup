import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Store, Calendar, Gift, CreditCard, QrCode, TrendingUp, Copy, Share2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const copyReferralCode = () => {
    navigator.clipboard.writeText("RWG-1HMTE49h");
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, Candy!
              </h1>
              <p className="text-blue-100 mb-4 text-lg">
                Level 1 Member • 125 loyalty points • $350.00 credits
              </p>
              <div className="w-full bg-blue-400 rounded-full h-3 mb-4 max-w-md">
                <div className="bg-white h-3 rounded-full" style={{ width: '12.5%' }}></div>
              </div>
              <p className="text-blue-200 text-sm">875 points to Level 2</p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingUp className="h-12 w-12 text-yellow-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-emerald-200" />
                    <p className="text-emerald-100 text-sm font-medium">Credits</p>
                    <p className="text-3xl font-bold">$350.00</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-purple-200" />
                    <p className="text-purple-100 text-sm font-medium">Loyalty Points</p>
                    <p className="text-3xl font-bold">125</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                    <p className="text-blue-100 text-sm font-medium">Referrals</p>
                    <p className="text-3xl font-bold">1</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-amber-200" />
                    <p className="text-amber-100 text-sm font-medium">Earnings</p>
                    <p className="text-3xl font-bold">$8.00</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
                  <Link href="/bookings">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Premium Beauty Consultation</p>
                        <p className="text-sm text-slate-600">May 30, 2025 at 10:00 AM</p>
                        <p className="text-xs text-blue-600">Advanced skincare analysis and treatment plan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">$150.00</p>
                      <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Gift className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Luxury Spa Treatment</p>
                        <p className="text-sm text-slate-600">June 2, 2025 at 2:30 PM</p>
                        <p className="text-xs text-purple-600">Full body relaxation massage with aromatherapy</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">$200.00</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border-2 border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">Account Credit Top-Up</p>
                        <p className="text-sm text-slate-600">May 27, 2025</p>
                      </div>
                    </div>
                    <p className="font-bold text-green-600">+$500.00</p>
                  </div>

                  <div className="flex items-center justify-between p-4 border-2 border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">Beauty Consultation Payment</p>
                        <p className="text-sm text-slate-600">May 27, 2025</p>
                      </div>
                    </div>
                    <p className="font-bold text-red-600">-$150.00</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Referral Code */}
            <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
              <CardHeader>
                <CardTitle className="text-white text-xl">Your Referral Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/20 rounded-lg p-6 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono mb-2">RWG-1HMTE49h</div>
                    <p className="text-emerald-100 text-sm">Share this code to earn commissions!</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={copyReferralCode}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Commission Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Commission Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                      <span className="font-medium">Direct Referrals</span>
                    </div>
                    <span className="font-bold text-emerald-600 text-lg">10%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                      <span className="font-medium">2nd Level</span>
                    </div>
                    <span className="font-bold text-blue-600 text-lg">3%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                      <span className="font-medium">3rd Level</span>
                    </div>
                    <span className="font-bold text-purple-600 text-lg">2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/bookings">
                  <Button variant="outline" className="w-full justify-start h-12 text-left">
                    <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                    Book New Appointment
                  </Button>
                </Link>
                
                <Button variant="outline" className="w-full justify-start h-12">
                  <CreditCard className="h-5 w-5 mr-3 text-emerald-600" />
                  Top Up Credits
                </Button>
                
                <Link href="/marketplace">
                  <Button variant="outline" className="w-full justify-start h-12">
                    <Store className="h-5 w-5 mr-3 text-purple-600" />
                    Browse Marketplace
                  </Button>
                </Link>
                
                <Button variant="outline" className="w-full justify-start h-12">
                  <QrCode className="h-5 w-5 mr-3 text-amber-600" />
                  Scan QR Code
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}