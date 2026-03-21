import { Button } from "@/components/ui/button";
import { Sparkles, Palette, GamepadIcon, Calendar, Star, Users, Gift, Zap, DollarSign, ArrowRight, Globe, MapPin } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import rwgLogo from "@assets/rwg-logo.png";

export default function Landing() {
  const { t } = useTranslation();

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="rwg-page-bg">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="rwg-orb-3" />
      <div className="rwg-grid-overlay" />

      {/* ── HEADER ── */}
      <header className="rwg-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-violet-300 to-blue-300 bg-clip-text text-transparent hidden sm:block">
              Reborn Wave Group
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button
              onClick={handleLogin}
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {t('landing.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="rwg-hero-badge mb-8">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>{t('landing.subtitle')}</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mb-6 leading-tight">
            <span className="rwg-text-gradient">Reborn</span>
            <br />
            <span className="text-white/90">Wave Group</span>
          </h1>

          <p className="text-base sm:text-lg text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('landing.visionText1')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleLogin}
              size="lg"
              className="group bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 px-8 py-6 rounded-2xl font-semibold text-base shadow-2xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>{t('landing.enterFuture')}</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleLogin}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-8 py-6 rounded-2xl font-semibold text-base backdrop-blur-sm transition-all duration-200"
            >
              <Globe className="w-4 h-4 mr-2" />
              {t('landing.exploreServices')}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="rwg-card grid grid-cols-3 divide-x divide-white/10">
            {[
              { label: "5-in-1 Concept", value: "#1" },
              { label: "Cities", value: "Global" },
              { label: "Referral", value: "10%" },
            ].map((stat) => (
              <div key={stat.label} className="py-4 px-6 text-center">
                <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-xs text-white/40 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="rwg-section-title mb-3">About Us</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              The World's First{" "}
              <span className="rwg-text-gradient">5-in-1 Business</span>
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto text-sm leading-relaxed">
              {t('landing.visionText2')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="rwg-card p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Star className="w-4 h-4 text-violet-400" />
                </div>
                {t('landing.ourVision')}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed mb-4">{t('landing.visionText1')}</p>
              <p className="text-white/55 text-sm leading-relaxed">{t('landing.visionText2')}</p>
            </div>

            <div className="space-y-4">
              <div className="rwg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl rwg-sector-icon-location flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Oceanic Bliss — Batam, Indonesia</h4>
                    <p className="text-white/45 text-xs leading-relaxed">
                      Ruko Batamas, Jl. Pasir Putih No.49-51, Sadai, Kec. Bengkong, Kota Batam, Kepulauan Riau 29444
                    </p>
                  </div>
                </div>
              </div>
              <div className="rwg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl rwg-sector-icon-concept flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🏢</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('landing.conceptTitle')}</h4>
                    <p className="text-white/45 text-xs leading-relaxed">{t('landing.conceptDescription')}</p>
                  </div>
                </div>
              </div>
              <div className="rwg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl rwg-sector-icon-global flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{t('landing.globalFirstTitle')}</h4>
                    <p className="text-white/45 text-xs leading-relaxed">{t('landing.globalFirstDescription')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 SECTORS ── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="rwg-section-title mb-3">{t('landing.fourSectors')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('landing.sectorsDescription')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                iconClass: "rwg-sector-icon-beauty",
                icon: <Palette className="w-5 h-5 text-white" />,
                title: t('landing.beautyWellness'),
                desc: t('landing.beautyDescription'),
                features: [t('landing.beautyFeature1'), t('landing.beautyFeature2'), t('landing.beautyFeature3')],
                dotColor: "bg-pink-400",
              },
              {
                iconClass: "rwg-sector-icon-food",
                icon: <span className="text-xl">🍽️</span>,
                title: t('landing.foodBeverage'),
                desc: t('landing.foodDescription'),
                features: [t('landing.foodFeature1'), t('landing.foodFeature2'), t('landing.foodFeature3')],
                dotColor: "bg-purple-400",
              },
              {
                iconClass: "rwg-sector-icon-entertainment",
                icon: <GamepadIcon className="w-5 h-5 text-white" />,
                title: t('landing.entertainment'),
                desc: t('landing.entertainmentDescription'),
                features: [t('landing.entertainmentFeature1'), t('landing.entertainmentFeature2'), t('landing.entertainmentFeature3')],
                dotColor: "bg-cyan-400",
              },
              {
                iconClass: "rwg-sector-icon-corporate",
                icon: <Calendar className="w-5 h-5 text-white" />,
                title: t('landing.corporateEvents'),
                desc: t('landing.corporateDescription'),
                features: [t('landing.corporateFeature1'), t('landing.corporateFeature2'), t('landing.corporateFeature3')],
                dotColor: "bg-emerald-400",
              },
            ].map((sector) => (
              <div key={sector.title} className="rwg-card p-6 flex flex-col gap-4">
                <div className={`w-10 h-10 rounded-xl ${sector.iconClass} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  {sector.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm mb-1.5">{sector.title}</h3>
                  <p className="text-white/45 text-xs leading-relaxed">{sector.desc}</p>
                </div>
                <ul className="space-y-1.5 mt-auto">
                  {sector.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/60">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sector.dotColor}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REFERRAL ── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="rwg-section-title mb-3">{t('landing.inviteFriends')}</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <span className="rwg-text-gradient">{t('landing.shareWithFriends')}</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
              {t('landing.referralDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rwg-card p-8 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl rwg-sector-icon-location flex items-center justify-center mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{t('landing.inviteFriendsTitle')}</h3>
              <div className="text-5xl font-extrabold rwg-text-gradient mb-3">10%</div>
              <p className="text-white/50 text-sm mb-4">{t('landing.commissionText')}</p>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <Gift className="w-3.5 h-3.5" />
                {t('landing.lifetimeEarnings')}
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 gap-4">
              {[
                { icon: <DollarSign className="w-4 h-4 text-emerald-400" />, title: t('landing.passiveIncome'), desc: t('landing.passiveIncomeDesc') },
                { icon: <Gift className="w-4 h-4 text-blue-400" />, title: t('landing.exclusiveBonuses'), desc: t('landing.exclusiveBonusesDesc') },
                { icon: <Star className="w-4 h-4 text-violet-400" />, title: t('landing.loyaltyPoints'), desc: t('landing.loyaltyPointsDesc') },
              ].map((item) => (
                <div key={item.title} className="rwg-card p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm mb-1">{item.title}</h4>
                    <p className="text-white/45 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rwg-card rwg-cta-card p-12">
            <div className="rwg-cta-badge mb-6 mx-auto">
              <Sparkles className="w-3 h-3" />
              {t('landing.joinRevolution')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              {t('landing.readyTransform')}{" "}
              <span className="rwg-text-gradient">{t('landing.yourExperience')}</span>
            </h2>
            <p className="text-white/50 text-sm mb-8 max-w-lg mx-auto leading-relaxed">
              {t('landing.joinThousands')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 px-8 py-6 rounded-2xl font-semibold shadow-2xl transition-all duration-200 hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('landing.accessPlatform')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-8 py-6 rounded-2xl font-semibold transition-all duration-200"
              >
                {t('landing.learnMore')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 rwg-footer py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg overflow-hidden">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-white/60">Reborn Wave Group</span>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-white/30 text-xs">{t('landing.allRightsReserved')}</p>
            <p className="text-white/20 text-xs mt-0.5">{t('landing.footerTagline')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
