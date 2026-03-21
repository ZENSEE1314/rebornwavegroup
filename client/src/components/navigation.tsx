import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { ChevronDown, Coins, Star, Settings, LogOut, Shield } from "lucide-react";
import { cn, formatCurrency, generateAvatarUrl } from "@/lib/utils";
import rwgLogo from "@assets/rwg-logo.png";

export default function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/" },
    { name: "Bookings", href: "/bookings" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Collections", href: "/seasonal-collections" },
    { name: "Loyalty", href: "/loyalty-program" },
    { name: "Referrals", href: "/referrals" },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Admin", href: "/admin" });
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="rwg-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer group">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img src={rwgLogo} alt="RWG" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-bold text-white/60 group-hover:text-white/80 transition-colors hidden lg:block">
              RWG
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <span className={cn(
                  "rwg-nav-tab cursor-pointer",
                  isActive && "active"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Credits pill */}
          <div className="rwg-pill-gold hidden sm:flex">
            <Coins className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{formatCurrency(user?.credits || "0")}</span>
          </div>

          {/* Points pill */}
          <div className="rwg-pill-green hidden sm:flex">
            <Star className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{(user?.loyaltyPoints || 0).toLocaleString()}</span>
          </div>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-white/8 transition-colors cursor-pointer outline-none">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback className="bg-violet-600 text-white text-xs">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3.5 w-3.5 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-white/10 text-white">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback className="bg-violet-600 text-white text-xs">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-white/40 truncate">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-white/8" />
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer text-white/70 hover:text-white hover:bg-white/8 focus:bg-white/8 focus:text-white">
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              </Link>
              {user?.role === "admin" && (
                <Link href="/admin">
                  <DropdownMenuItem className="cursor-pointer text-violet-400 hover:text-violet-300 hover:bg-white/8 focus:bg-white/8">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuSeparator className="bg-white/8" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
