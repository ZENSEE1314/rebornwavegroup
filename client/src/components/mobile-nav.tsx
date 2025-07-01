import { useLocation } from "wouter";
import { Link } from "wouter";
import { Home, Calendar, Store, Users, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Bookings", href: "/bookings", icon: Calendar },
    { name: "Market", href: "/marketplace", icon: Store },
    { name: "Collections", href: "/seasonal-collections", icon: Sparkles },
    { name: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40 safe-area-bottom">
      <div className="grid grid-cols-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center py-3 px-2 min-h-[60px] transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-slate-500 hover:text-primary hover:bg-slate-50"
              )}>
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium leading-tight text-center">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
