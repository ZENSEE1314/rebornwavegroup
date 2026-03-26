import React, { useState, useRef, useEffect } from "react";

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.style.setProperty('--rwg-w', `${Math.min(percent, 100)}%`);
  }, [percent]);
  return <div ref={ref} className={`rwg-stat-fill ${className ?? ''}`} />;
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, CreditCard, History, Settings, DollarSign, Banknote, Copy } from "lucide-react";
import { formatCurrency, formatDateTime, generateAvatarUrl, getStatusColor } from "@/lib/utils";
import MobileBackButton from "@/components/mobile-back-button";

export default function Profile() {
  const { user } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "settings">("overview");
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
      toast({ title: "Success", description: "Credits added successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setIsTopUpOpen(false);
      setTopUpAmount("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add credits", variant: "destructive" });
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount && parseFloat(topUpAmount) > 0) topUpMutation.mutate(topUpAmount);
  };

  const handleCopyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    }
  };

  const quickTopUpAmounts = ["10", "25", "50", "100"];

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: User },
    { id: "transactions" as const, label: "Transactions", icon: History },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit_purchase': return { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" };
      case 'appointment_payment': return { icon: User, color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/25" };
      case 'referral_bonus': return { icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/25" };
      case 'toy_sale': return { icon: Banknote, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/25" };
      default: return { icon: CreditCard, color: "text-white/40", bg: "bg-white/10 border-white/20" };
    }
  };

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <MobileBackButton className="mb-4" />
        <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8">

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-xl mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 flex-1 justify-center py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="rwg-card p-6">
                  <h3 className="text-white font-bold text-base mb-4">Profile Information</h3>
                  <div className="flex items-center space-x-5">
                    <Avatar className="w-20 h-20 rounded-2xl">
                      <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                      <AvatarFallback className="rounded-2xl">
                        <img
                          src={generateAvatarUrl(`${user?.firstName} ${user?.lastName}`)}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white">
                        {user?.firstName} {user?.lastName}
                      </h2>
                      <p className="text-white/50">{user?.email}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${
                          user?.role === 'admin'
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                            : 'bg-white/10 text-white/60 border-white/20'
                        }`}>
                          {user?.role === 'admin' ? 'Administrator' : 'Member'}
                        </span>
                        <span className="text-xs bg-white/10 border border-white/20 text-white/60 px-2.5 py-1 rounded-full">
                          Level {user?.level || 1}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rwg-card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/50 text-sm font-medium">Account Balance</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(user?.credits || '0')}</p>
                        <p className="text-emerald-400 text-sm font-medium">Available credits</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                  <div className="rwg-card p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/50 text-sm font-medium">Loyalty Points</p>
                        <p className="text-3xl font-bold text-white">{user?.loyaltyPoints?.toLocaleString() || 0}</p>
                        <p className="text-violet-400 text-sm font-medium">Total earned</p>
                      </div>
                      <div className="w-12 h-12 bg-violet-500/15 border border-violet-500/25 rounded-xl flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-violet-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
                <div className="rwg-card p-6">
                  <h3 className="text-white font-bold text-base mb-4">Your Referral Code</h3>
                  <div className="bg-gradient-to-r from-emerald-500/15 to-violet-600/15 border border-emerald-500/25 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-emerald-300 text-sm mb-1">Share this code with friends</p>
                        <code className="text-2xl font-mono font-bold text-white">{user?.referralCode}</code>
                      </div>
                      <Button
                        onClick={handleCopyReferralCode}
                        className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="rwg-card p-6">
                <h3 className="text-white font-bold text-base mb-6">Transaction History</h3>
                <div className="space-y-3">
                  {transactions && transactions.length > 0 ? (
                    transactions.map((transaction: any) => {
                      const txStyle = getTransactionIcon(transaction.type);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${txStyle.bg}`}>
                              <txStyle.icon className={`h-5 w-5 ${txStyle.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{transaction.description}</p>
                              <p className="text-xs text-white/40">{formatDateTime(transaction.createdAt)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(transaction.status)}`}>
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${Number(transaction.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {Number(transaction.amount) > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                            </p>
                            {transaction.pointsEarned > 0 && (
                              <p className="text-xs text-white/40">+{transaction.pointsEarned} pts</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 mx-auto mb-4 text-white/20" />
                      <p className="text-white/40">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="rwg-card p-6">
                <h3 className="text-white font-bold text-base mb-6">Account Settings</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-white/70 text-sm">First Name</Label>
                      <Input id="firstName" value={user?.firstName || ''} disabled className="rwg-input mt-1 opacity-60" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-white/70 text-sm">Last Name</Label>
                      <Input id="lastName" value={user?.lastName || ''} disabled className="rwg-input mt-1 opacity-60" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white/70 text-sm">Email Address</Label>
                    <Input id="email" type="email" value={user?.email || ''} disabled className="rwg-input mt-1 opacity-60" />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount" className="text-white/70 text-sm">Bank Account Number</Label>
                    <Input id="bankAccount" value={user?.bankAccountNumber || ''} placeholder="Not set" disabled className="rwg-input mt-1 opacity-60" />
                  </div>
                  <div>
                    <Label htmlFor="bankName" className="text-white/70 text-sm">Bank Name</Label>
                    <Input id="bankName" value={user?.bankName || ''} placeholder="Not set" disabled className="rwg-input mt-1 opacity-60" />
                  </div>
                  <div className="border-t border-white/10 pt-5">
                    <p className="text-sm text-white/40">
                      Profile information is managed through your authentication provider. Contact support to update your personal details.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">

            {/* Quick Actions */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-base mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full border-0 rounded-xl text-black font-bold hover:opacity-90 transition-opacity"
                      style={{ background: "linear-gradient(135deg, #C9A84C, #F5D87A)" }}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Top Up Credits
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#14082e] border border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Credits</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTopUp} className="space-y-4">
                      <div>
                        <Label htmlFor="amount" className="text-white/70 text-sm">Amount ($)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="1"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="0.00"
                          required
                          className="rwg-input mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-white/70 text-sm">Quick Amounts</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {quickTopUpAmounts.map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              onClick={() => setTopUpAmount(amount)}
                              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-sm"
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl"
                        disabled={topUpMutation.isPending}
                      >
                        {topUpMutation.isPending ? "Processing..." : "Add Credits"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  className="w-full text-white/40 hover:text-white/60 hover:bg-white/5 rounded-xl border border-white/10"
                  disabled
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Cash Out (Coming Soon)
                </Button>
              </div>
            </div>

            {/* Level Progress */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-base mb-4">Level Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Current Level</span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-full">
                    Level {user?.level || 1}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Progress to Level {(user?.level || 1) + 1}</span>
                    <span className="text-white/50">{user?.loyaltyPoints || 0} / {((user?.level || 1) + 1) * 1000} pts</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <ProgressBar
                      percent={((user?.loyaltyPoints || 0) % 1000) / 10}
                      className="bg-violet-500 h-2 rounded-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-white/40">
                  Earn points by making purchases, bookings, and through referrals!
                </p>
              </div>
            </div>

            {/* Account Summary */}
            <div className="rwg-card p-6">
              <h3 className="text-white font-bold text-base mb-4">Account Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Member Since</span>
                  <span className="font-medium text-white">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : user?.id
                        ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Total Transactions</span>
                  <span className="font-medium text-white">{transactions?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Account Status</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
