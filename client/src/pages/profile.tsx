import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, CreditCard, History, Settings, DollarSign, Banknote, Copy } from "lucide-react";
import { formatCurrency, formatDateTime, generateAvatarUrl, getStatusColor } from "@/lib/utils";

export default function Profile() {
  const { user } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const topUpMutation = useMutation({
    mutationFn: async (amount: string) => {
      return await apiRequest("POST", "/api/transactions/top-up", { amount });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credits added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsTopUpOpen(false);
      setTopUpAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add credits",
        variant: "destructive",
      });
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount && parseFloat(topUpAmount) > 0) {
      topUpMutation.mutate(topUpAmount);
    }
  };

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const quickTopUpAmounts = ["10", "25", "50", "100"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content */}
        <div className="lg:col-span-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                
                {/* Profile Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-6">
                      <Avatar className="w-20 h-20">
                        <AvatarImage 
                          src={user?.profileImageUrl} 
                          alt={`${user?.firstName} ${user?.lastName}`} 
                        />
                        <AvatarFallback>
                          <img 
                            src={generateAvatarUrl(`${user?.firstName} ${user?.lastName}`)}
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {user?.firstName} {user?.lastName}
                        </h2>
                        <p className="text-slate-600">{user?.email}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                            {user?.role === 'admin' ? 'Administrator' : 'Member'}
                          </Badge>
                          <Badge variant="outline">
                            Level {user?.level || 1}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm font-medium">Account Balance</p>
                          <p className="text-3xl font-bold text-slate-800">
                            {formatCurrency(user?.credits || '0')}
                          </p>
                          <p className="text-emerald-600 text-sm font-medium">Available credits</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm font-medium">Loyalty Points</p>
                          <p className="text-3xl font-bold text-slate-800">
                            {user?.loyaltyPoints?.toLocaleString() || 0}
                          </p>
                          <p className="text-primary-600 text-sm font-medium">Total earned</p>
                        </div>
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Referral Code */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Referral Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-r from-emerald-500 to-primary-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-emerald-100 mb-2">Share this code with friends</p>
                          <code className="text-2xl font-mono font-bold">{user?.referralCode}</code>
                        </div>
                        <Button 
                          variant="secondary"
                          onClick={handleCopyReferralCode}
                          className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions && transactions.length > 0 ? (
                      transactions.map((transaction: any) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transaction.type === 'credit_purchase' ? 'bg-emerald-100' :
                              transaction.type === 'appointment_payment' ? 'bg-primary-100' :
                              transaction.type === 'referral_bonus' ? 'bg-amber-100' :
                              transaction.type === 'toy_sale' ? 'bg-purple-100' :
                              'bg-slate-100'
                            }`}>
                              {transaction.type === 'credit_purchase' && <CreditCard className="h-5 w-5 text-emerald-600" />}
                              {transaction.type === 'appointment_payment' && <User className="h-5 w-5 text-primary-600" />}
                              {transaction.type === 'referral_bonus' && <DollarSign className="h-5 w-5 text-amber-600" />}
                              {transaction.type === 'toy_sale' && <Banknote className="h-5 w-5 text-purple-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{transaction.description}</p>
                              <p className="text-sm text-slate-600">
                                {formatDateTime(transaction.createdAt)}
                              </p>
                              <Badge className={getStatusColor(transaction.status)} size="sm">
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              Number(transaction.amount) > 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {Number(transaction.amount) > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                            </p>
                            {transaction.pointsEarned > 0 && (
                              <p className="text-xs text-slate-500">+{transaction.pointsEarned} pts</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={user?.firstName || ''}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={user?.lastName || ''}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-slate-50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bankAccount">Bank Account Number</Label>
                      <Input
                        id="bankAccount"
                        value={user?.bankAccountNumber || ''}
                        placeholder="Not set"
                        disabled
                        className="bg-slate-50"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={user?.bankName || ''}
                        placeholder="Not set"
                        disabled
                        className="bg-slate-50"
                      />
                    </div>

                    <div className="border-t pt-6">
                      <p className="text-sm text-slate-600 mb-4">
                        Profile information is managed through your authentication provider. 
                        Contact support to update your personal details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Top-Up */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Top Up Credits
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Credits</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTopUp} className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="1"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <Label>Quick Amounts</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {quickTopUpAmounts.map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setTopUpAmount(amount)}
                          >
                            ${amount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={topUpMutation.isPending}>
                      {topUpMutation.isPending ? "Processing..." : "Add Credits"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full" disabled>
                <Banknote className="h-4 w-4 mr-2" />
                Cash Out (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Level Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Level</span>
                  <Badge>Level {user?.level || 1}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to Level {(user?.level || 1) + 1}</span>
                    <span>{user?.loyaltyPoints || 0} / {((user?.level || 1) + 1) * 1000} pts</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.min(((user?.loyaltyPoints || 0) % 1000) / 10, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Earn points by making purchases, bookings, and through referrals!
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Member Since</span>
                <span className="font-medium">
                  {user?.createdAt ? formatDateTime(user.createdAt).split(',')[0] : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total Transactions</span>
                <span className="font-medium">{transactions?.length || 0}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Account Status</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
