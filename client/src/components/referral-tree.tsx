import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface Referral {
  id: number;
  referrerId: string;
  referredId: string;
  level: number;
  commissionRate: string;
  totalEarnings: string;
  createdAt: string;
}

interface ReferralTreeProps {
  referrals?: Referral[];
}

// Simple avatar URL generator
const generateAvatarUrl = (name: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
};

export default function ReferralTree({ referrals = [] }: ReferralTreeProps) {
  const level1Referrals = referrals.filter(r => r.level === 1);

  if (referrals.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No referrals yet</p>
        <p className="text-sm">Share your referral code to start building your network!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level 1 - Direct Referrals */}
      {level1Referrals.length > 0 && (
        <div className="border-l-4 border-emerald-500 pl-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Level 1 - Direct Referrals</h3>
            <Badge className="bg-emerald-100 text-emerald-700">
              {level1Referrals.length} users
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {level1Referrals.slice(0, 8).map((referral) => (
              <Card key={referral.id} className="p-3">
                <div className="flex items-center space-x-2">
                  <img 
                    src={generateAvatarUrl(`User ${referral.referredId}`)}
                    alt="User"
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      User #{referral.referredId.slice(-6)}
                    </p>
                    <p className="text-xs text-emerald-600">
                      ${referral.totalEarnings || '0.00'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {level1Referrals.length > 8 && (
              <div className="flex items-center justify-center p-3 bg-slate-100 rounded-lg text-slate-500 text-sm">
                +{level1Referrals.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}



      {/* Summary Stats */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600">{level1Referrals.length}</p>
            <p className="text-sm text-slate-600">Direct Referrals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">10%</p>
            <p className="text-sm text-slate-600">Commission Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
