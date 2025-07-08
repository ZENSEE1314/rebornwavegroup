import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Store, Calendar, Gift, CreditCard, QrCode, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const typedUser = user as User;
  
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/transactions"],
    enabled: isAuthenticated,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["/api/users/referrals"],
    enabled: isAuthenticated,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
  });

  const { data: toys = [] } = useQuery({
    queryKey: ["/api/toys"],
    enabled: isAuthenticated,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["/api/marketplace/my-listings"],
    enabled: isAuthenticated,
  });

  // Calculate level progress
  const currentPoints = typedUser?.loyaltyPoints || 0;
  const currentLevel = typedUser?.level || 1;
  const pointsForNextLevel = currentLevel * 1000;
  const progressPercentage = Math.min((currentPoints % 1000) / 10, 100);

  const recentTransactions = transactions.slice(0, 3);
  const activeListings = listings.filter((l: any) => l.status === 'active').length;
  const totalReferrals = referrals.length;
  const totalEarnings = referrals.reduce((sum: number, ref: any) => sum + parseFloat(ref.totalEarnings || '0'), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Dashboard */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-primary-500 to-emerald-500 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.firstName || 'User'}!
                </h1>
                <p className="text-primary-100 mb-4">
                  Level {currentLevel} Member • Next level in {pointsForNextLevel - currentPoints} points
                </p>
                <div className="w-full bg-primary-400 rounded-full h-2 mb-4">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-10 w-10 text-amber-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Total Referrals</p>
                    <p className="text-2xl font-bold text-slate-800">{totalReferrals}</p>
                    <p className="text-emerald-600 text-sm font-medium">Active network</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Referral Earnings</p>
                    <p className="text-2xl font-bold text-slate-800">${totalEarnings.toFixed(2)}</p>
                    <p className="text-primary-600 text-sm font-medium">Total earned</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">Active Listings</p>
                    <p className="text-2xl font-bold text-slate-800">{activeListings}</p>
                    <p className="text-amber-600 text-sm font-medium">In marketplace</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Store className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Network Visualization */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Referral Network</CardTitle>
                <Link href="/referrals">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ReferralTree referrals={referrals} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.type === 'referral_bonus' ? 'bg-emerald-100' :
                          transaction.type === 'appointment_payment' ? 'bg-primary-100' :
                          transaction.type === 'toy_sale' ? 'bg-amber-100' :
                          'bg-slate-100'
                        }`}>
                          {transaction.type === 'referral_bonus' && <Users className="h-5 w-5 text-emerald-600" />}
                          {transaction.type === 'appointment_payment' && <Calendar className="h-5 w-5 text-primary-600" />}
                          {transaction.type === 'toy_sale' && <Gift className="h-5 w-5 text-amber-600" />}
                          {transaction.type === 'credit_purchase' && <CreditCard className="h-5 w-5 text-slate-600" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{transaction.description}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(transaction.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          Number(transaction.amount) > 0 ? 'text-emerald-600' : 'text-slate-600'
                        }`}>
                          {Number(transaction.amount) > 0 ? '+' : ''}${transaction.amount}
                        </p>
                        {transaction.pointsEarned > 0 && (
                          <p className="text-xs text-slate-500">+{transaction.pointsEarned} pts</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Referral Code Section */}
          <div className="bg-gradient-to-br from-emerald-500 to-primary-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-bold mb-4">Your Referral Code</h3>
            <div className="bg-white/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <code className="text-lg font-mono font-bold">{user?.referralCode}</code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white"
                  onClick={() => navigator.clipboard.writeText(user?.referralCode || '')}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full bg-white text-emerald-600 font-semibold hover:bg-slate-50">
                Share Code
              </Button>
              <p className="text-emerald-100 text-sm text-center">
                Earn up to 15% commission on referrals!
              </p>
            </div>
          </div>

          {/* Commission Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <span className="font-medium text-slate-800">Direct Referral</span>
                </div>
                <span className="font-bold text-emerald-600">10%</span>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  Earn 10% commission on all verified purchases made by people you refer
                </p>
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
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <span className="font-medium">Book Appointment</span>
                  </div>
                  <span className="text-slate-400">→</span>
                </Button>
              </Link>
              
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium">Top Up Credits</span>
                </div>
                <span className="text-slate-400">→</span>
              </Button>
              
              <Button variant="ghost" className="w-full justify-between">
                <div className="flex items-center space-x-3">
                  <QrCode className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Scan QR Code</span>
                </div>
                <span className="text-slate-400">→</span>
              </Button>
              
              <Link href="/marketplace">
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center space-x-3">
                    <Store className="h-5 w-5 text-slate-600" />
                    <span className="font-medium">Browse Marketplace</span>
                  </div>
                  <span className="text-slate-400">→</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Credits</span>
                <span className="font-bold text-slate-800">${user?.credits || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Loyalty Points</span>
                <span className="font-bold text-emerald-600">{user?.loyaltyPoints || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Level</span>
                <Badge variant="secondary">Level {user?.level || 1}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Collectibles</span>
                <span className="font-bold text-amber-600">{toys?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
