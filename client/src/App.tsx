import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, Component, lazy, Suspense, type ReactNode } from "react";

// ── Error boundary for the whole app ──────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div className="rwg-page-bg min-h-screen p-10 font-mono">
          <h1 className="text-red-400 text-2xl font-bold mb-4">App Error</h1>
          <pre className="text-red-300 text-sm whitespace-pre-wrap mb-4">{err.message}</pre>
          <pre className="text-gray-400 text-xs whitespace-pre-wrap mb-6">{err.stack}</pre>
          <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-violet-700 text-white rounded-lg cursor-pointer">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Error boundary that catches failed lazy-chunk loads ────────────────────────
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return (
        <div className="rwg-page-bg min-h-screen w-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-white/60 text-sm mb-4">Failed to load page. Check your connection.</p>
            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Eagerly loaded — critical first-paint pages ────────────────────────────────
import Landing from "@/pages/landing";
import Login from "@/pages/Login";
import CompleteApp from "@/pages/complete-app";   // main app — must never hang

// ── Lazy-loaded — secondary pages, each gets its own chunk ────────────────────
const Bookings             = lazy(() => import("@/pages/bookings-working"));
const Marketplace          = lazy(() => import("@/pages/marketplace-working"));
const Referrals            = lazy(() => import("@/pages/referrals"));
const MyReferral           = lazy(() => import("@/pages/my-referral"));
const LoyaltyProgram       = lazy(() => import("@/pages/loyalty-program"));
const Profile              = lazy(() => import("@/pages/profile"));
const EnhancedAdminDashboard = lazy(() => import("@/pages/enhanced-admin-dashboard"));
const SimpleCollections    = lazy(() => import("@/pages/simple-collections"));
const Checkout             = lazy(() => import("@/pages/checkout"));
const PaymentSuccess       = lazy(() => import("@/pages/payment-success"));
const NotFound             = lazy(() => import("@/pages/not-found"));
const SimplePetCare        = lazy(() => import("@/pages/simple-pet-care"));
const PetCareWithEnergy    = lazy(() => import("@/pages/pet-care-with-energy"));
const InvestorLanding      = lazy(() => import("@/pages/investor-landing"));
const LuxExperience        = lazy(() => import("@/pages/lux-experience"));
const InvestorLogin        = lazy(() => import("@/pages/investor-login"));
const InvestorDashboard    = lazy(() => import("@/pages/investor-dashboard"));
const InvestorAdmin        = lazy(() => import("@/pages/investor-admin"));

// Shared loading fallback
function PageLoader() {
  return (
    <div className="rwg-page-bg min-h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4" />
        <p className="text-white/40 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Handle OAuth referral code processing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    
    if (oauthSuccess === 'true' && isAuthenticated) {
      const pendingReferralCode = localStorage.getItem('pendingReferralCode');
      
      if (pendingReferralCode) {
        // Apply the referral code
        apiRequest('POST', '/api/auth/apply-referral', { referralCode: pendingReferralCode })
        .then(async (response) => {
          const result = await response.json();
          toast({
            title: "Referral Applied",
            description: `Referral code "${pendingReferralCode}" has been applied to your account!`,
            variant: "default",
          });
          localStorage.removeItem('pendingReferralCode');
        })
        .catch((error) => {
          console.error('Error applying referral code:', error);
          toast({
            title: "Referral Code Error",
            description: error.message || "Failed to apply referral code",
            variant: "destructive",
          });
          localStorage.removeItem('pendingReferralCode');
        });
      }
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, toast]);

  if (isLoading) {
    return (
      <div className="rwg-page-bg min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/40 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Login route should always be accessible */}
        <Route path="/login" component={Login} />
        <Route path="/reset-password" component={Login} />
        <Route path="/investor/login" component={InvestorLogin} />
        <Route path="/investor" component={InvestorLanding} />
        <Route path="/lux" component={LuxExperience} />

        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            {/* Default route - both admin and regular users can access main app */}
            <Route path="/" component={CompleteApp} />
            <Route path="/complete-app" component={CompleteApp} />
            <Route path="/investor/admin" component={InvestorAdmin} />
            <Route path="/investor/dashboard" component={InvestorDashboard} />
            <Route path="/admin" component={EnhancedAdminDashboard} />
            <Route path="/admin-dashboard" component={EnhancedAdminDashboard} />
            <Route path="/app" component={CompleteApp} />
            <Route path="/pet-care" component={SimplePetCare} />
            <Route path="/energy-potion" component={PetCareWithEnergy} />
            <Route path="/bookings" component={Bookings} />
            <Route path="/marketplace" component={Marketplace} />
            <Route path="/referrals" component={Referrals} />
            <Route path="/my-referral" component={MyReferral} />
            <Route path="/loyalty-program" component={LoyaltyProgram} />
            <Route path="/seasonal-collections" component={SimpleCollections} />
            <Route path="/profile" component={Profile} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/payment-success" component={PaymentSuccess} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
    </ChunkErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
