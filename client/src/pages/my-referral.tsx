import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Users, DollarSign, Gift, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyReferral() {
  const { user } = useAuth();
  const { toast } = useToast();
  const typedUser = user as User;

  const copyReferralCode = () => {
    if (typedUser?.referralCode) {
      navigator.clipboard.writeText(typedUser.referralCode);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const shareReferralCode = () => {
    const message = `Join Reborn Wave Group and experience premium beauty, fun & entertainment services! Use my referral code: ${typedUser?.referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "Join Reborn Wave Group",
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Referral message copied to clipboard",
      });
    }
  };

  const generateQRCode = () => {
    const qrData = `https://rebornwave.app/signup?ref=${typedUser?.referralCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    window.open(qrUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Referral Code</h1>
        <p className="text-slate-600">Share your code and earn 10% commission on all verified purchases!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Referral Code Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl font-bold font-mono mb-2">RWG-1HMTE49h</div>
                <p className="text-emerald-100 text-sm">Share this code with friends</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <Button 
                onClick={copyReferralCode}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button 
                onClick={shareReferralCode}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                onClick={generateQRCode}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commission Structure */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <span className="font-medium">Direct Referrals</span>
              </div>
              <Badge className="bg-emerald-500 text-white">10%</Badge>
            </div>
            
            <div className="text-center py-4">
              <p className="text-sm text-slate-600">
                Earn 10% commission on all verified purchases made by people you refer
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-600">Credits</span>
              </div>
              <span className="font-bold text-slate-800">$350.00</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Gift className="w-5 h-5 text-purple-600" />
                <span className="text-slate-600">Loyalty Points</span>
              </div>
              <span className="font-bold text-purple-600">125</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-slate-600">Level</span>
              </div>
              <Badge variant="secondary">Level 1</Badge>
            </div>
          </CardContent>
        </Card>

        {/* How to Use */}
        <Card>
          <CardHeader>
            <CardTitle>How to Share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">1</div>
                <div>
                  <p className="font-medium text-slate-800">Copy your code</p>
                  <p className="text-sm text-slate-600">Use the copy button above</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                <div>
                  <p className="font-medium text-slate-800">Share with friends</p>
                  <p className="text-sm text-slate-600">Send via WhatsApp, email, or social media</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">3</div>
                <div>
                  <p className="font-medium text-slate-800">Earn commissions</p>
                  <p className="text-sm text-slate-600">Get paid when they use services</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}