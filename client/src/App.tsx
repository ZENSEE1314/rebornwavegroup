import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard-new";
import Bookings from "@/pages/bookings";
import Marketplace from "@/pages/marketplace";
import Referrals from "@/pages/referrals";
import MyReferral from "@/pages/my-referral";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
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
          <Navigation />
          <Route path="/" component={Dashboard} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/referrals" component={Referrals} />
          <Route path="/my-referral" component={MyReferral} />
          <Route path="/profile" component={Profile} />
          {user?.role === 'admin' && (
            <Route path="/admin" component={AdminDashboard} />
          )}
          <MobileNav />
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
