import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, Component, type ReactNode } from "react";

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
import Landing from "@/pages/landing";
import Login from "@/pages/Login";
import CompleteApp from "@/pages/complete-app";
import Bookings from "@/pages/bookings-working";
import Marketplace from "@/pages/marketplace-working";
import Referrals from "@/pages/referrals";
import MyReferral from "@/pages/my-referral";
import LoyaltyProgram from "@/pages/loyalty-program";
import Profile from "@/pages/profile";
import EnhancedAdminDashboard from "@/pages/enhanced-admin-dashboard";
import SimpleCollections from "@/pages/simple-collections";
import Checkout from "@/pages/checkout";
import PaymentSuccess from "@/pages/payment-success";
import NotFound from "@/pages/not-found";
import SimplePetCare from "@/pages/simple-pet-care";
import PetCareWithEnergy from "@/pages/pet-care-with-energy";

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
    <Switch>
      {/* Login route should always be accessible */}
      <Route path="/login" component={Login} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Default route - both admin and regular users can access main app */}
          <Route path="/" component={CompleteApp} />
          <Route path="/complete-app" component={CompleteApp} />
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
