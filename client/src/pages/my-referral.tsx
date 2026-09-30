import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { RebornLayout } from "@/components/RebornLayout";
import { Copy, Share2, Users, DollarSign, Gift, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, localeTag } from "@/lib/i18n";

export default function MyReferral() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const typedUser = user as User;

  const copyReferralCode = () => {
    if (typedUser?.referralCode) {
      navigator.clipboard.writeText(typedUser.referralCode);
      toast({ title: t("ac.myref.copied"), description: t("ac.myref.codeCopied") });
    }
  };

  const shareReferralCode = () => {
    const message = t("ac.myref.shareMsg", { code: typedUser?.referralCode ?? "" });
    if (navigator.share) {
      navigator.share({ title: t("ac.myref.shareTitle"), text: message });
    } else {
      navigator.clipboard.writeText(message);
      toast({ title: t("ac.myref.copied"), description: t("ac.myref.msgCopied") });
    }
  };

  const generateQRCode = () => {
    const qrData = `https://rebornwave.app/signup?ref=${typedUser?.referralCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    window.open(qrUrl, '_blank');
  };

  return (
    <RebornLayout active="/my-referral" title={t("ac.myref.pageTitle")}><div>
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="max-w-3xl mx-auto py-2 relative z-10">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{t("ac.myref.title")}</h1>
          <p className="text-white/50 text-sm">{t("ac.myref.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">

          {/* Referral Code Card */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border border-emerald-500/30 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-4">{t("ac.myref.yourCode")}</h3>
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold font-mono text-white mb-1">
                  {typedUser?.referralCode || t("ac.myref.loadingCode")}
                </div>
                <p className="text-emerald-300 text-sm">{t("ac.myref.shareWithFriends")}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={copyReferralCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <Copy className="w-4 h-4 mr-1" />
                {t("ac.myref.copy")}
              </Button>
              <Button
                onClick={shareReferralCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-1" />
                {t("ac.myref.share")}
              </Button>
              <Button
                onClick={generateQRCode}
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-xl"
              >
                <QrCode className="w-4 h-4 mr-1" />
                {t("ac.myref.qr")}
              </Button>
            </div>
          </div>

          {/* Commission Structure */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">{t("ac.myref.commission")}</h3>
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <span className="font-medium text-white">{t("ac.myref.direct")}</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-bold px-3 py-1 rounded-full">10%</span>
            </div>
            <p className="text-sm text-white/50 text-center">
              {t("ac.myref.commissionDesc")}
            </p>
          </div>

          {/* Account Summary */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">{t("ac.myref.account")}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-white/70">{t("ac.myref.earnings")}</span>
                </div>
                <span className="font-bold text-white">RP {Number(typedUser?.referralEarnings || 0).toLocaleString(localeTag(language))}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-violet-500/15 border border-violet-500/25 rounded-xl flex items-center justify-center">
                    <Gift className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-white/70">{t("ac.myref.points")}</span>
                </div>
                <span className="font-bold text-violet-400">{typedUser?.loyaltyPoints ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-blue-500/15 border border-blue-500/25 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white/70">{t("ac.myref.levelLabel")}</span>
                </div>
                <span className="text-sm bg-white/10 border border-white/20 text-white/70 px-3 py-1 rounded-full">{t("ac.myref.level", { n: typedUser?.level ?? 1 })}</span>
              </div>
            </div>
          </div>

          {/* How to Use */}
          <div className="rwg-card p-6">
            <h3 className="text-white font-bold text-lg mb-4">{t("ac.myref.howTo")}</h3>
            <div className="space-y-4">
              {[
                { num: 1, color: "bg-emerald-500", title: t("ac.myref.step1"), desc: t("ac.myref.step1d") },
                { num: 2, color: "bg-blue-500", title: t("ac.myref.step2"), desc: t("ac.myref.step2d") },
                { num: 3, color: "bg-violet-500", title: t("ac.myref.step3"), desc: t("ac.myref.step3d") },
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
    </div></RebornLayout>
  );
}
