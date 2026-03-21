import { useLocation } from "wouter";
import { Link } from "wouter";
import { Home, Calendar, Store, User, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Bookings", href: "/bookings", icon: Calendar },
    { name: "Market", href: "/marketplace", icon: Store },
    { name: "Referrals", href: "/referrals", icon: Users },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 safe-area-inset-bottom rwg-mobile-nav">
      <div className="grid grid-cols-5 h-16">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center h-full gap-1 transition-all duration-200",
                isActive
                  ? "rwg-mobile-nav-active"
                  : "rwg-mobile-nav-item"
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "text-violet-400" : "text-white/40")} />
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-violet-400" : "text-white/35"
                )}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
