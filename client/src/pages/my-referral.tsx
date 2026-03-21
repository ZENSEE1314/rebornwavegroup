import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Users, DollarSign, Gift, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyReferral() {
  const { user } = useAuth();
  const { toast } = useToast();
  const typedUser = user as User;

  const copyReferralCode = () => {
    if (typedUser?.referralCode) {
      navigator.clipboard.writeText(typedUser.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    }
  };

  const shareReferralCode = () => {
    const message = `Join Reborn Wave Group and experience premium beauty, fun & entertainment services! Use my referral code: ${typedUser?.referralCode}`;
    if (navigator.share) {
      navigator.share({ title: "Join Reborn Wave Group", text: message });
    } else {
      navigator.clipboard.writeText(message);
      toast({ title: "Copied!", description: "Referral message copied to clipboard" });
    }
  };

  const generateQRCode = () => {
    const qrData = `https://rebornwave.app/signup?ref=${typedUser?.referralCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    window.open(qrUrl, '_blank');
  };

  return (
    <div className="rwg-page-bg min-h-screen pb-20 md:pb-0">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Referral Code</h1>
          <p className="text-white/50">Share your code and earn 10% commission on all verified purchases!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Referral Code Card */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border border-emerald-500/30 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-4">Your Referral Code</h3>
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-white mb-1">
                  {typedUser?.referralCode || 'RWG-LOADING'}
                </div>
                <p className="text-emerald-300 text-sm">Share this code with friends</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={copyReferralCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button
                onClick={shareReferralCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                onClick={generateQRCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <QrCode className="w-4 h-4 mr-1" />
                QR
              </Button>
            </div>
          </div>

          {/* Commission Structure */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">Commission Structure</h3>
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <span className="font-medium text-white">Direct Referrals</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-bold px-3 py-1 rounded-full">10%</span>
            </div>
            <p className="text-sm text-white/50 text-center">
              Earn 10% commission on all verified purchases made by people you refer
            </p>
          </div>

          {/* Account Summary */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">Your Account</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-white/70">Credits</span>
                </div>
                <span className="font-bold text-white">$350.00</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-violet-500/15 border border-violet-500/25 rounded-xl flex items-center justify-center">
                    <Gift className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-white/70">Loyalty Points</span>
                </div>
                <span className="font-bold text-violet-400">125</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-blue-500/15 border border-blue-500/25 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white/70">Level</span>
                </div>
                <span className="text-sm bg-white/10 border border-white/20 text-white/70 px-3 py-1 rounded-full">Level 1</span>
              </div>
            </div>
          </div>

          {/* How to Use */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">How to Share</h3>
            <div className="space-y-4">
              {[
                { num: 1, color: "bg-emerald-500", title: "Copy your code", desc: "Use the copy button above" },
                { num: 2, color: "bg-blue-500", title: "Share with friends", desc: "Send via WhatsApp, email, or social media" },
                { num: 3, color: "bg-violet-500", title: "Earn commissions", desc: "Get paid when they use services" },
              ].map(step => (
                <div key={step.num} className="flex items-start space-x-3">
                  <div className={`w-6 h-6 ${step.color} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-0.5`}>
                    {step.num}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{step.title}</p>
                    <p className="text-sm text-white/50">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
