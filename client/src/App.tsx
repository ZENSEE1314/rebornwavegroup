import { Switch, Route, useLocation } from "wouter";
import { FeatureGate } from "@/lib/features";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { setLanguage, translate, loadTranslations } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, Component, lazy as reactLazy, Suspense, type ReactNode, type ComponentType } from "react";

// After a new version is deployed, page files get new names; a phone still running
// the old version asks for files that no longer exist. When a page file fails to
// load, reload once (fresh index.html → new file names) instead of showing an error.
const RELOAD_KEY = "rwg-chunk-reload";
function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false; // already tried just now → show the error
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage blocked: still reload once */ }
  window.location.reload();
  return true;
}
function lazy<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return reactLazy(() => load().catch((err) => {
    if (reloadForNewVersion()) return new Promise<{ default: T }>(() => {}); // page is reloading
    throw err;
  }));
}
// A page whose texts live in a separately loaded dictionary (lib/i18n.ts): fetch both at once.
function withText<T extends ComponentType<any>>(part: Parameters<typeof loadTranslations>[0], load: () => Promise<{ default: T }>) {
  return lazy(() => Promise.all([load(), loadTranslations(part)]).then(([page]) => page));
}
if (typeof window !== "undefined") {
  // Vite's own preload failures (CSS/JS of a page) — same fix.
  window.addEventListener("vite:preloadError", (e) => { if (reloadForNewVersion()) e.preventDefault(); });
}

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
// While an update is rolling out a page file can be missing for a short while: the error
// screen reloads by itself a few times before leaving it to the Retry button.
const AUTO_RETRY_KEY = "rwg-chunk-auto-retries";
const AUTO_RETRY_MAX = 3;
const AUTO_RETRY_DELAY_MS = 6_000;

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    let attempts = AUTO_RETRY_MAX;
    try { attempts = Number(sessionStorage.getItem(AUTO_RETRY_KEY) || 0); } catch { /* storage blocked: no auto retry */ }
    if (attempts >= AUTO_RETRY_MAX) return;
    this.retryTimer = setTimeout(() => {
      try { sessionStorage.setItem(AUTO_RETRY_KEY, String(attempts + 1)); sessionStorage.removeItem(RELOAD_KEY); } catch {}
      window.location.reload();
    }, AUTO_RETRY_DELAY_MS);
  }
  componentWillUnmount() { clearTimeout(this.retryTimer); }
  render() {
    if (this.state.failed) {
      return (
        <div className="rwg-page-bg min-h-screen w-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-white/60 text-sm mb-4 px-6">{translate("app.loadFailed")}</p>
            <button type="button" onClick={() => { try { sessionStorage.removeItem(RELOAD_KEY); sessionStorage.removeItem(AUTO_RETRY_KEY); } catch {} window.location.reload(); }} className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm cursor-pointer">
              {translate("app.retry")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Eagerly loaded — critical first-paint pages ────────────────────────────────
import { FLAGSHIP_TENANT_SLUG, rememberedTenantSlug, useTenantBrand } from "@/hooks/useTenantBrand";
import Login from "@/pages/Login";

// ── Lazy-loaded — secondary pages, each gets its own chunk ────────────────────
// Loaded only when opened, so the first page loads fast.
const Landing              = lazy(() => import("@/pages/landing"));
const CompleteApp          = withText("games", () => import("@/pages/complete-app"));
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
// ── Reborn Wave member experience (2026 redesign) ──────────────────────────
const RebornDashboard      = lazy(() => import("@/pages/reborn-dashboard"));
const RebornPet            = lazy(() => import("@/pages/reborn-pet"));
const RebornSpin           = lazy(() => import("@/pages/reborn-spin"));
const RebornGames          = withText("games", () => import("@/pages/reborn-games"));
const RebornAttend         = lazy(() => import("@/pages/reborn-attend"));
const OrderTable           = lazy(() => import("@/pages/order-table"));
const TicketView           = lazy(() => import("@/pages/ticket-view"));
const TenantEntry          = lazy(() => import("@/pages/tenant-entry"));
const RebornSupport        = lazy(() => import("@/pages/reborn-support"));
const RebornAdmin          = withText("staff", () => import("@/pages/reborn-admin"));
const RebornKos            = lazy(() => import("@/pages/reborn-kos"));
const RebornSong           = lazy(() => import("@/pages/reborn-song"));
const RebornEvents         = lazy(() => import("@/pages/reborn-events"));
const RebornChat           = lazy(() => import("@/pages/reborn-chat"));
const RebornOrder          = lazy(() => import("@/pages/reborn-order"));
const RebornPos            = withText("staff", () => import("@/pages/reborn-pos"));
const RebornProfile        = lazy(() => import("@/pages/reborn-profile"));
const RebornBottles        = lazy(() => import("@/pages/reborn-bottles"));
const RebornHistory        = lazy(() => import("@/pages/reborn-history"));
const BridgeXAdmin         = withText("staff", () => import("@/pages/bridgex-admin"));
const StaffFeedback        = lazy(() => import("@/pages/staff-feedback"));
const BridgeXLanding       = lazy(() => import("@/pages/bridgex-landing"));
const BridgeXLogin         = lazy(() => import("@/pages/bridgex-login"));
const BridgeXApply         = lazy(() => import("@/pages/bridgex-apply"));

// Shared loading fallback
function PageLoader() {
  return (
    <div className="rwg-page-bg min-h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent mx-auto mb-4" />
        <p className="text-white/40 text-sm">{translate("common.loading")}</p>
      </div>
    </div>
  );
}


// The public homepage is the standalone 3D tower (client/public/experience), served
// by the server as static files — leave the SPA so it loads.
function ExperienceRedirect() {
  // Already on /experience and the server still sent the app → reloading would loop
  // (the page kept blinking). Show the welcome page instead.
  if (INITIAL_PATH.startsWith("/experience")) return <Landing />;
  window.location.replace(`/experience/${window.location.search}`);
  return null;
}

// Where this SPA instance was first loaded; if the server already chose the SPA for "/"
// (e.g. dev, or a session the client doesn't recognise), reloading "/" would loop.
const INITIAL_PATH = window.location.pathname;

// Logged-out "/" — the server serves the 3D tower at the root on the flagship domain.
// Member pages the admin can switch off (Admin › App features).
function gated(path: string, C: ComponentType<any>) {
  return function Gated(props: any) { return <FeatureGate path={path}><C {...props} /></FeatureGate>; };
}
const GatedRebornPet = gated("/pet", RebornPet);
const GatedRebornSpin = gated("/spin", RebornSpin);
const GatedRebornGames = gated("/games", RebornGames);
const GatedRebornSupport = gated("/support", RebornSupport);
const GatedRebornKos = gated("/kos", RebornKos);
const GatedRebornSong = gated("/songs", RebornSong);
const GatedRebornChat = gated("/chat", RebornChat);
const GatedRebornOrder = gated("/order", RebornOrder);
const GatedRebornBottles = gated("/bottles", RebornBottles);
const GatedBookings = gated("/bookings", Bookings);
const GatedReferrals = gated("/referrals", Referrals);
const GatedMyReferral = gated("/my-referral", MyReferral);
const GatedLoyaltyProgram = gated("/loyalty-program", LoyaltyProgram);
const GatedRebornHistory = gated("/history", RebornHistory);

function HomeRedirect() {
  const brand = useTenantBrand();
  if (brand.isLoading) return null;
  // Another company's app (its own server, or entered through /t/<slug>) opens its own page.
  if (brand.isWhiteLabel && brand.slug) window.location.replace(`/t/${brand.slug}`);
  else if (INITIAL_PATH === "/") window.location.replace(`/experience/${window.location.search}`);
  else window.location.assign(`/${window.location.search}`);
  return null;
}

// Member pages opened while logged out (e.g. a table QR scanned with the phone
// camera): send them to login / sign-up and come back to the same link after.
const AFTER_LOGIN_KEY = "reborn.afterLogin";
function LoginFirst() {
  const to = window.location.pathname + window.location.search;
  try { localStorage.setItem(AFTER_LOGIN_KEY, JSON.stringify({ to, at: Date.now() })); } catch {}
  window.location.replace(`/login?next=${encodeURIComponent(to)}`);
  return null;
}
function takeAfterLogin(): string | null {
  try {
    const raw = localStorage.getItem(AFTER_LOGIN_KEY);
    if (!raw) return null;
    localStorage.removeItem(AFTER_LOGIN_KEY);
    const { to, at } = JSON.parse(raw);
    return typeof to === "string" && to.startsWith("/") && !to.startsWith("//") && Date.now() - Number(at) < 60 * 60_000 ? to : null;
  } catch { return null; }
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  // Signed in (any way — password, sign-up, Google, Apple) after scanning a link → finish that link.
  useEffect(() => {
    if (!isAuthenticated) return;
    const to = takeAfterLogin();
    if (to && window.location.pathname + window.location.search !== to) window.location.replace(to);
  }, [isAuthenticated]);
  const { toast } = useToast();
  const bridgeXHost = /bridgexpos/i.test(window.location.hostname) || (import.meta.env.VITE_BRIDGEX_DOMAIN && window.location.hostname === import.meta.env.VITE_BRIDGEX_DOMAIN);
  const [brandLoc] = useLocation();

  // BridgeX platform pages carry BridgeX branding (tab title + favicon), not the tenant's.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (link && !(link as any)._orig) { (link as any)._orig = link.href; (link as any)._origTitle = document.title; }
    const onBridge = bridgeXHost || /^\/bridgex/i.test(brandLoc);
    if (onBridge) {
      document.title = "BridgeXPOS — Business Operating System";
      if (link) link.href = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#22d3ee'/><text x='32' y='45' font-family='Arial,Helvetica,sans-serif' font-size='32' font-weight='bold' text-anchor='middle' fill='#06121d'>BX</text></svg>");
    } else if (link && (link as any)._orig) {
      document.title = (link as any)._origTitle || document.title;
      link.href = (link as any)._orig;
    }
  }, [brandLoc, bridgeXHost]);

  // Keep every active screen current. Server-sent events update immediately;
  // the timer covers mobile networks that temporarily suspend the stream.
  useEffect(() => {
    if (!isAuthenticated) return;
    let stopped = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;
    const refresh = () => queryClient.invalidateQueries({ refetchType: "active" });
    const connect = () => {
      if (stopped) return;
      source?.close();
      source = new EventSource("/api/live");
      source.addEventListener("change", refresh);
      source.onerror = () => {
        source?.close();
        if (!stopped) reconnectTimer = window.setTimeout(connect, 3000);
      };
    };
    connect();
    const fallback = window.setInterval(refresh, 10_000);
    const resume = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", refresh);
    window.addEventListener("bridgex:notification", refresh);
    return () => {
      stopped = true;
      source?.close();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.clearInterval(fallback);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", refresh);
      window.removeEventListener("bridgex:notification", refresh);
    };
  }, [isAuthenticated]);

  // Adopt the member's saved language on a fresh device (unless they already picked one here).
  useEffect(() => {
    const pref = (user as any)?.preferredLanguage;
    let hasLocal = false;
    try { hasLocal = !!localStorage.getItem("language"); } catch {}
    if (pref && !hasLocal && ["en", "zh", "id"].includes(pref)) setLanguage(pref);
  }, [(user as any)?.preferredLanguage]);

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
          <p className="text-white/40 text-sm">{translate("common.loading")}</p>
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
        <Route path="/bridgexpos" component={BridgeXLanding} />
        <Route path="/bridgexpos/login" component={BridgeXLogin} />
        <Route path="/bridgexpos/apply" component={BridgeXApply} />
        <Route path="/bridgex" component={isAuthenticated ? BridgeXAdmin : BridgeXLogin} />
        <Route path="/reset-password" component={Login} />
        <Route path="/investor/login" component={InvestorLogin} />
        <Route path="/investor" component={InvestorLanding} />
        <Route path="/lux" component={LuxExperience} />
        <Route path="/experience" component={ExperienceRedirect} />
        <Route path="/welcome" component={Landing} />
        <Route path="/attend" component={RebornAttend} />
        <Route path="/order/t/:token" component={OrderTable} />
        <Route path="/ticket/:code" component={TicketView} />
        <Route path="/t/:slug" component={TenantEntry} />

        {!isAuthenticated ? (
          <>
            <Route path="/" component={bridgeXHost ? BridgeXLanding : HomeRedirect} />
            {["/kos", "/songs", "/events", "/order", "/pet", "/bookings", "/chat", "/games", "/spin", "/bottles", "/profile", "/history"].map((p) => <Route key={p} path={p} component={LoginFirst} />)}
          </>
        ) : (
          <>
            {/* New member dashboard is the home; full legacy app still at /complete-app */}
            <Route path="/" component={RebornDashboard} />
            <Route path="/pet" component={GatedRebornPet} />
            <Route path="/spin" component={GatedRebornSpin} />
            <Route path="/games" component={GatedRebornGames} />
            <Route path="/support" component={GatedRebornSupport} />
            <Route path="/kos" component={GatedRebornKos} />
            <Route path="/songs" component={GatedRebornSong} />
            <Route path="/events" component={RebornEvents} />
            <Route path="/chat" component={GatedRebornChat} />
            <Route path="/order" component={GatedRebornOrder} />
            <Route path="/bottles" component={GatedRebornBottles} />
            <Route path="/pos" component={RebornPos} />
            <Route path="/reborn-admin" component={RebornAdmin} />
            <Route path="/staff-feedback" component={StaffFeedback} />
            <Route path="/complete-app" component={CompleteApp} />
            <Route path="/investor/admin" component={InvestorAdmin} />
            <Route path="/investor/dashboard" component={InvestorDashboard} />
            <Route path="/admin" component={EnhancedAdminDashboard} />
            <Route path="/admin-dashboard" component={EnhancedAdminDashboard} />
            <Route path="/app" component={CompleteApp} />
            <Route path="/pet-care" component={SimplePetCare} />
            <Route path="/energy-potion" component={PetCareWithEnergy} />
            <Route path="/bookings" component={GatedBookings} />
            <Route path="/marketplace" component={Marketplace} />
            <Route path="/referrals" component={GatedReferrals} />
            <Route path="/my-referral" component={GatedMyReferral} />
            <Route path="/loyalty-program" component={GatedLoyaltyProgram} />
            <Route path="/seasonal-collections" component={SimpleCollections} />
            <Route path="/profile" component={RebornProfile} />
            <Route path="/history" component={GatedRebornHistory} />
            <Route path="/profile-legacy" component={Profile} />
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
  // The app has stayed up: a later page-file failure starts its retries from zero again.
  useEffect(() => {
    const settled = setTimeout(() => { try { sessionStorage.removeItem(AUTO_RETRY_KEY); } catch {} }, 20_000);
    return () => clearTimeout(settled);
  }, []);
  useEffect(() => {
    const host = window.location.hostname;
    const isBridgeX = /bridgexpos/i.test(host) || window.location.pathname.startsWith("/bridgex");
    if (isBridgeX) {
      document.title = "BridgeXPOS | White-label POS for every business";
      const description = document.querySelector("meta[name='description']");
      description?.setAttribute("content", "Create a multi-branch POS, staff system, website and branded Android or iOS app for your company.");
    }
    // Outside the BridgeX console, a business entered via /t/<slug> keeps its name, colours and icon.
    const tenantSlug = window.location.pathname.startsWith("/bridgex") ? "" : rememberedTenantSlug();
    fetch(`/api/v1/tenant/resolve?host=${encodeURIComponent(host)}&slug=${encodeURIComponent(tenantSlug)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((tenant) => {
        if (!tenant) return;
        // The flagship site keeps its SEO title from index.html; white-label tenants get their own name.
        if (tenant.slug !== FLAGSHIP_TENANT_SLUG) document.title = tenant.app_name || tenant.name;
        const primary = tenant.theme?.primaryColor;
        const accent = tenant.theme?.accentColor;
        if (primary) document.documentElement.style.setProperty("--bridgex-primary", primary);
        if (accent) document.documentElement.style.setProperty("--bridgex-accent", accent);
        if (tenant.logo_url) {
          let icon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
          if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
          icon.href = tenant.logo_url;
        }
      }).catch(() => undefined);
  }, []);
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
