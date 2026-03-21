import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="rwg-page-bg min-h-screen flex items-center justify-center p-4">
      <div className="rwg-orb-1" />
      <div className="rwg-orb-2" />
      <div className="text-center max-w-sm mx-auto relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-5xl font-extrabold text-white mb-3">404</h1>
        <h2 className="text-xl font-semibold text-white/80 mb-3">Page Not Found</h2>
        <p className="text-white/40 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <button type="button" className="rwg-btn inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
