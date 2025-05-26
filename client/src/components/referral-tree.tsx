import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingDown } from "lucide-react";
import { generateAvatarUrl } from "@/lib/utils";

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

export default function ReferralTree({ referrals = [] }: ReferralTreeProps) {
  const level1Referrals = referrals.filter(r => r.level === 1);
  const level2Referrals = referrals.filter(r => r.level === 2);
  const level3Referrals = referrals.filter(r => r.level === 3);

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

      {/* Level 2 - Indirect Referrals */}
      {level2Referrals.length > 0 && (
        <div className="border-l-4 border-primary-500 pl-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Level 2 - Indirect Referrals</h3>
            <Badge className="bg-primary-100 text-primary-700">
              {level2Referrals.length} users
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {level2Referrals.slice(0, 6).map((referral) => (
              <div key={referral.id} className="flex items-center space-x-2 p-2 bg-primary-50 rounded-lg">
                <img 
                  src={generateAvatarUrl(`User ${referral.referredId}`)}
                  alt="User"
                  className="w-5 h-5 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    #{referral.referredId.slice(-4)}
                  </p>
                </div>
              </div>
            ))}
            {level2Referrals.length > 6 && (
              <div className="flex items-center justify-center p-2 bg-primary-100 rounded-lg text-primary-600 text-xs">
                +{level2Referrals.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level 3 - Extended Network */}
      {level3Referrals.length > 0 && (
        <div className="border-l-4 border-amber-500 pl-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Level 3 - Extended Network</h3>
            <Badge className="bg-amber-100 text-amber-700">
              {level3Referrals.length} users
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            <span>{level3Referrals.length} third-level referrals earning 2% commission</span>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-600">{level1Referrals.length}</p>
            <p className="text-sm text-slate-600">Direct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-600">{level2Referrals.length}</p>
            <p className="text-sm text-slate-600">2nd Level</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{level3Referrals.length}</p>
            <p className="text-sm text-slate-600">3rd Level</p>
          </div>
        </div>
      </div>
    </div>
  );
}
