import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import CompleteApp from "@/pages/complete-app";
import Bookings from "@/pages/bookings-working";
import Marketplace from "@/pages/marketplace-working";
import Referrals from "@/pages/referrals-working";
import MyReferral from "@/pages/my-referral";
import LoyaltyProgram from "@/pages/loyalty-program";
import Profile from "@/pages/profile";
import EnhancedAdminDashboard from "@/pages/enhanced-admin-dashboard";
import NotFound from "@/pages/not-found";
import SimplePetCare from "@/pages/simple-pet-care";
import PetCareWithEnergy from "@/pages/pet-care-with-energy";
import TestPetCare from "@/pages/test-pet-care";
import Navigation from "@/components/navigation";
import MobileNav from "@/components/mobile-nav";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Default route - both admin and regular users can access main app */}
          <Route path="/" component={CompleteApp} />
          <Route path="/admin" component={EnhancedAdminDashboard} />
          <Route path="/admin-dashboard" component={EnhancedAdminDashboard} />
          <Route path="/app" component={CompleteApp} />
          <Route path="/pet-care" component={SimplePetCare} />
          <Route path="/energy-potion" component={PetCareWithEnergy} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
