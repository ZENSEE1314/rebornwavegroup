import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileBackButtonProps {
  className?: string;
  onBack?: () => void;
}

export default function MobileBackButton({ className, onBack }: MobileBackButtonProps) {
  const [location, setLocation] = useLocation();

  // Don't show back button on home page
  if (location === "/") {
    return null;
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Default back navigation
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback to home if no history
        setLocation("/");
      }
    }
  };

  return (
    <div className={cn("md:hidden", className)}>
      <Button
        onClick={handleBack}
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 p-2"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Back</span>
      </Button>
    </div>
  );
}