import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Store, Calendar, Gift, CreditCard, QrCode, TrendingUp, Copy } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Your actual account data
  const referralCode = "RWG-1HMTE49h";
  const credits = "350.00";
  const loyaltyPoints = 125;
  const level = 1;

  // Sample data that represents your actual bookings and activities
  const appointments = [
    { id: 1, title: "Premium Beauty Consultation", date: "2025-05-30", time: "10:00 AM", cost: 150, status: "confirmed" },
    { id: 2, title: "Luxury Spa Treatment", date: "2025-06-02", time: "2:30 PM", cost: 200, status: "pending" }
  ];

  const transactions = [
    { id: 1, type: "top_up", amount: 500, description: "Account credit top-up", date: "2025-05-27" },
    { id: 2, type: "purchase", amount: -150, description: "Beauty consultation payment", date: "2025-05-27" }
  ];

  const referralStats = {
    totalReferrals: 1,
    totalEarnings: 8.00,
    level1Referrals: 1,
    level2Referrals: 0,
    level3Referrals: 0
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
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
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {user?.firstName || user?.email?.split('@')[0] || 'User'}!
              </h1>
              <p className="text-blue-100 mb-4">
                Level {level} Member • {loyaltyPoints} loyalty points
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <TrendingUp className="h-10 w-10 text-yellow-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Credits</p>
                      <p className="text-3xl font-bold">${credits}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Loyalty Points</p>
                      <p className="text-3xl font-bold">{loyaltyPoints}</p>
                    </div>
                    <Gift className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Referral Earnings</p>
                      <p className="text-3xl font-bold">${referralStats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <Link href="/bookings">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{appointment.title}</p>
                          <p className="text-sm text-slate-600">{appointment.date} at {appointment.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">${appointment.cost}</p>
                        <Badge variant={appointment.status === 'confirmed' ? 'default' : 'secondary'}>
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.type === 'top_up' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            transaction.type === 'top_up' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{transaction.description}</p>
                          <p className="text-sm text-slate-600">{transaction.date}</p>
                        </div>
                      </div>
                      <p className={`font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Referral Code */}
            <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
              <CardHeader>
                <CardTitle className="text-white">Your Referral Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/20 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono mb-2">{referralCode}</div>
                    <p className="text-emerald-100 text-sm">Share this code with friends</p>
                  </div>
                </div>
                <Button 
                  onClick={copyReferralCode}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>

            {/* Referral Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Referral Network</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Referrals</span>
                    <span className="font-bold text-slate-800">{referralStats.totalReferrals}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Total Earnings</span>
                    <span className="font-bold text-emerald-600">${referralStats.totalEarnings.toFixed(2)}</span>
                  </div>
                  <Link href="/my-referral">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/bookings">
                  <Button variant="ghost" className="w-full justify-start">
                    <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                    Book Appointment
                  </Button>
                </Link>
                
                <Button variant="ghost" className="w-full justify-start">
                  <CreditCard className="h-5 w-5 mr-3 text-emerald-600" />
                  Top Up Credits
                </Button>
                
                <Link href="/marketplace">
                  <Button variant="ghost" className="w-full justify-start">
                    <Store className="h-5 w-5 mr-3 text-purple-600" />
                    Browse Marketplace
                  </Button>
                </Link>
                
                <Button variant="ghost" className="w-full justify-start">
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