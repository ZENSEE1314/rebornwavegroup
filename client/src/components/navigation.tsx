import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { ChevronDown, Coins, Star, Settings, LogOut, Shield } from "lucide-react";
import { cn, formatCurrency, generateAvatarUrl } from "@/lib/utils";
import rwgLogo from "@assets/rwg-logo.png";

export default function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", current: location === "/" },
    { name: "Bookings", href: "/bookings", current: location === "/bookings" },
    { name: "Marketplace", href: "/marketplace", current: location === "/marketplace" },
    { name: "Collections", href: "/seasonal-collections", current: location === "/seasonal-collections" },
    { name: "Loyalty", href: "/loyalty", current: location === "/loyalty" },
    { name: "Referrals", href: "/referrals", current: location === "/referrals" },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: "Admin", href: "/admin", current: location === "/admin" });
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
                <img src={rwgLogo} alt="Reborn Wave Group" className="h-10 w-auto" />
              </div>
            </Link>
            
            <div className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span
                    className={cn(
                      item.current
                        ? "text-primary-600 font-medium border-b-2 border-primary-500 pb-4"
                        : "text-slate-600 hover:text-primary-600 transition-colors pb-4",
                      "cursor-pointer"
                    )}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Credits */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                {formatCurrency(user?.credits || '0')}
              </span>
            </div>
            
            {/* Loyalty Points */}
            <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 px-3 py-1 rounded-full">
              <Star className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">
                {user?.loyaltyPoints?.toLocaleString() || 0} pts
              </span>
            </div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={user?.profileImageUrl} 
                      alt={`${user?.firstName} ${user?.lastName}`} 
                    />
                    <AvatarFallback>
                      <img 
                        src={generateAvatarUrl(`${user?.firstName} ${user?.lastName}`)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center space-x-2 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={user?.profileImageUrl} 
                      alt={`${user?.firstName} ${user?.lastName}`} 
                    />
                    <AvatarFallback>
                      <img 
                        src={generateAvatarUrl(`${user?.firstName} ${user?.lastName}`)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin">
                    <DropdownMenuItem className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
