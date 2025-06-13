import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Palette, Music, GamepadIcon, Calendar, Star, Users, Gift, Zap, ChevronRight, TrendingUp, Award, DollarSign, ArrowRight, Check, Globe, Shield, Rocket } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Landing() {
  const { t } = useTranslation();
  
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Enhanced Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-cyan-900/30"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-10 right-10 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl animate-pulse delay-700"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl animate-pulse delay-300"></div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-ping delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-cyan-400/25 rounded-full animate-ping delay-500"></div>
      </div>

      {/* Enhanced Header */}
      <header className="relative z-10 bg-black/60 backdrop-blur-xl border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                  <Sparkles className="w-6 h-6 text-white relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Reborn Wave Group
                </span>
                <div className="text-xs text-white/60 font-medium tracking-wider">
                  Premium Digital Platform
                </div>
              </div>
              <div className="sm:hidden">
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  RWG
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSelector />
              <Button 
                onClick={handleLogin} 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white px-6 sm:px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5"
              >
                <Zap className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('landing.getStarted')}</span>
                <span className="sm:hidden">{t('landing.login')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative z-10 py-20 sm:py-32 lg:py-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-10">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600/30 to-cyan-600/30 border border-purple-400/40 rounded-full text-sm font-semibold backdrop-blur-md shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <Sparkles className="w-4 h-4 mr-2 text-purple-300" />
              The Future of Beauty, Food & Beverage & Entertainment
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-8xl xl:text-9xl font-bold mb-8 leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl">
              {t('landing.title')}
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-12 max-w-5xl mx-auto leading-relaxed font-light">
            {t('landing.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
            <Button 
              onClick={handleLogin}
              size="lg" 
              className="group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-6 text-lg rounded-full font-semibold shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <Rocket className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              <span>Enter the Future</span>
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/30 bg-white/10 hover:bg-white/20 text-white px-12 py-6 text-lg rounded-full font-semibold backdrop-blur-md transition-all duration-300 hover:border-white/50 hover:shadow-xl"
            >
              <Globe className="w-5 h-5 mr-2" />
              Explore Services
            </Button>
          </div>

          {/* About Us Overview */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="mb-6">
                <span className="px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-full text-sm font-medium text-white">
                  🌟 Singapore Innovation
                </span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  About Reborn Wave Group
                </span>
              </h3>
              <p className="text-xl text-white/70 max-w-4xl mx-auto mb-8">
                The world's first 5-in-1 business concept revolutionizing lifestyle experiences
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* About Content */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
                  <h4 className="text-2xl font-bold text-white mb-6">Our Vision</h4>
                  <p className="text-white/70 leading-relaxed mb-4">
                    Based in Singapore, Reborn Wave Group is pioneering the world's first 5-in-1 business concept that seamlessly 
                    integrates beauty, food & beverage, gaming, KTV, and cutting-edge IT solutions into one extraordinary destination.
                  </p>
                  <p className="text-white/70 leading-relaxed mb-4">
                    We are a comprehensive one-stop station designed for tours, couples, families, and corporate clients to enjoy 
                    a full-day experience with us. From beauty treatments from top to tail, three complete meals (breakfast, lunch, dinner), 
                    to entertainment for adults and kids - we offer it all.
                  </p>
                  <p className="text-white/70 leading-relaxed">
                    Our venue features breathtaking scenery including a sky bar with stunning sea views, beautiful night lighting, 
                    and Instagram-worthy photo spots throughout the facility.
                  </p>
                </div>
              </div>
              
              {/* Features & Location */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-2xl">🏢</span>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">5-in-1 Concept</h4>
                    <p className="text-white/70 text-sm">Beauty • F&B • Gaming • KTV • IT Solutions</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-2xl">🌏</span>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">Global First</h4>
                    <p className="text-white/70 text-sm">World's first integrated lifestyle destination</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                  <h4 className="text-xl font-bold text-white mb-4">Visit Us</h4>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center mt-1">
                      <span className="text-sm">📍</span>
                    </div>
                    <div>
                      <h5 className="text-white font-semibold">Our Location</h5>
                      <p className="text-white/70 text-sm">42RX+GWX, Jl. Gajah Mada, Sadai</p>
                      <p className="text-white/70 text-sm">Kec. Bengkong, Kota Batam</p>
                      <p className="text-white/70 text-sm">Kepulauan Riau 29444, Indonesia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Sectors */}
      <section className="relative z-10 py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Four Revolutionary Sectors
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Discover premium services designed for the modern lifestyle
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
            {/* Beauty Sector */}
            <div className="group relative bg-gradient-to-br from-pink-900/20 to-rose-900/20 backdrop-blur-sm border border-pink-500/20 rounded-3xl p-8 hover:border-pink-400/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Beauty & Wellness</h3>
                <p className="text-white/70 mb-6 leading-relaxed">
                  Professional beauty treatments, wellness consultations, and premium spa services. 
                  Experience luxury skincare, rejuvenating therapies, and personalized beauty solutions.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                    <span>Advanced Skincare Treatments</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                    <span>Luxury Spa Experiences</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                    <span>Personal Beauty Consultations</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Food & Beverage Sector */}
            <div className="group relative bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm border border-purple-500/20 rounded-3xl p-8 hover:border-purple-400/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">🍽️</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Food & Beverage</h3>
                <p className="text-white/70 mb-6 leading-relaxed">
                  Premium culinary experiences, artisan coffee, craft beverages, and gourmet dining services. 
                  Savor exceptional flavors and enjoy memorable dining moments with friends and family.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Gourmet Dining Experiences</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Artisan Coffee & Beverages</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Catering & Event Services</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Entertainment Sector */}
            <div className="group relative bg-gradient-to-br from-cyan-900/20 to-blue-900/20 backdrop-blur-sm border border-cyan-500/20 rounded-3xl p-8 hover:border-cyan-400/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <GamepadIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Entertainment & Gaming</h3>
                <p className="text-white/70 mb-6 leading-relaxed">
                  Premium entertainment experiences, gaming lounges, collectible trading, and exclusive events. 
                  Immerse yourself in cutting-edge entertainment technology and community experiences.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span>Gaming Lounge Access</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span>Collectible Trading Platform</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span>Exclusive Entertainment Events</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Event Sector */}
            <div className="group relative bg-gradient-to-br from-emerald-900/20 to-teal-900/20 backdrop-blur-sm border border-emerald-500/20 rounded-3xl p-8 hover:border-emerald-400/40 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Corporate Events</h3>
                <p className="text-white/70 mb-6 leading-relaxed">
                  Professional event planning, corporate retreats, team building activities, and business conferences. 
                  Create memorable corporate experiences that strengthen relationships and drive success.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span>Business Conferences</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span>Team Building Events</span>
                  </div>
                  <div className="flex items-center space-x-3 text-white/80">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span>Corporate Retreats</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Referral Rewards System */}
      <section className="relative z-10 py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 rounded-full text-sm font-medium text-white">
                💎 Invite Friends & Gain More Rewards
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Share with Friends
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-4xl mx-auto">
              Invite your friends and earn 10% commission every time they spend on our platform.
            </p>
          </div>
          
          <div className="flex justify-center mb-16">
            {/* Friend Referral Card */}
            <div className="group relative bg-gradient-to-br from-emerald-900/30 to-blue-900/30 backdrop-blur-sm border border-emerald-500/30 rounded-3xl p-12 hover:border-emerald-400/50 transition-all duration-500 max-w-md">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Invite Friends</h3>
                <div className="text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-4">
                  10%
                </div>
                <p className="text-white/70 mb-6 text-lg">
                  Earn 10% commission every time your friends spend on our platform
                </p>
                <div className="flex items-center justify-center space-x-2 text-emerald-400">
                  <Gift className="w-5 h-5" />
                  <span className="text-sm font-medium">Lifetime Earnings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Calculation */}
          <div className="bg-gradient-to-r from-emerald-900/20 to-blue-900/20 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Simple & Rewarding</h3>
              <p className="text-white/70">
                Share with friends and earn <span className="text-emerald-400 font-bold">10% commission</span> from every purchase they make
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <DollarSign className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Passive Income</h4>
                <p className="text-white/70 text-sm">Earn money while you sleep from your network's activities</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <Gift className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Exclusive Bonuses</h4>
                <p className="text-white/70 text-sm">Unlock special rewards and VIP benefits as your network grows</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
                <Star className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-white mb-2">Loyalty Points</h4>
                <p className="text-white/70 text-sm">Earn points with every transaction and level up your status</p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="relative z-10 py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-cyan-900/30 backdrop-blur-sm border border-white/10 rounded-3xl p-12 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-3xl"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="mb-8">
                <span className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-cyan-600/30 border border-purple-500/40 rounded-full text-sm font-medium text-white">
                  🚀 Join the Revolution
                </span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Ready to Transform
                </span>
                <br />
                <span className="text-white">
                  Your Experience?
                </span>
              </h2>
              
              <p className="text-xl text-white/70 mb-12 max-w-3xl mx-auto">
                Join thousands of users who are already experiencing the future of beauty, food & beverage, and entertainment. 
                Start sharing with friends and earning 10% from their spending today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button 
                  onClick={handleLogin}
                  size="lg" 
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white px-12 py-6 text-lg rounded-full font-semibold shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Access the Platform
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-white/30 bg-white/10 hover:bg-white/20 text-white px-12 py-6 text-lg rounded-full font-semibold backdrop-blur-sm transition-all duration-300"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black/50 backdrop-blur-lg border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Reborn Wave Group
              </span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm">
                © 2025 Reborn Wave Group. All rights reserved.
              </p>
              <p className="text-white/40 text-xs mt-1">
                The future of beauty, food & beverage, entertainment & corporate events
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
