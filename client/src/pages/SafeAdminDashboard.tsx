import React, { useState, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";

// Lazy load the enhanced admin dashboard
const EnhancedAdminDashboard = React.lazy(() => import("./enhanced-admin-dashboard"));

// Simple fallback admin interface
const SimpleAdminInterface = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 border-white/20">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="text-white data-[state=active]:bg-blue-600">
              Users
            </TabsTrigger>
            <TabsTrigger value="emails" className="text-white data-[state=active]:bg-blue-600">
              Emails
            </TabsTrigger>
            <TabsTrigger value="content" className="text-white data-[state=active]:bg-blue-600">
              Content
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">System Overview</CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <p>Welcome to the admin dashboard. The system is currently loading...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Email Template Management</CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <p>Email template system is being loaded...</p>
                <p className="text-sm text-gray-300 mt-2">
                  The email template system includes:
                </p>
                <ul className="text-sm text-gray-300 mt-2 space-y-1">
                  <li>• Create welcome email templates</li>
                  <li>• Newsletter templates</li>
                  <li>• Promotional email templates</li>
                  <li>• Custom template management</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <p>User management interface is loading...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card className="bg-slate-800/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Content Management</CardTitle>
              </CardHeader>
              <CardContent className="text-white">
                <p>Content management tools are loading...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Safe admin dashboard wrapper with multiple fallback levels
export default function SafeAdminDashboard() {
  const { user } = useAuth();
  const [useSimpleInterface, setUseSimpleInterface] = useState(false);

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-8 flex items-center justify-center">
        <Card className="bg-slate-800/60 border-slate-700/50 p-8">
          <CardContent className="text-center text-white">
            <h2 className="text-xl font-bold mb-4">Access Denied</h2>
            <p>Admin privileges required to access this dashboard.</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Simple interface fallback
  if (useSimpleInterface) {
    return <SimpleAdminInterface />;
  }

  // Try to load the enhanced admin dashboard with multiple error boundaries
  return (
    <ErrorBoundary 
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-8 flex items-center justify-center">
          <Card className="bg-slate-800/60 border-slate-700/50 p-8 max-w-md">
            <CardContent className="text-center text-white">
              <h2 className="text-xl font-bold mb-4">Dashboard Loading Error</h2>
              <p className="text-sm text-gray-300 mb-4">
                {error?.message || 'The enhanced dashboard failed to load'}
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={resetError}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Try Enhanced Dashboard Again
                </Button>
                <Button 
                  onClick={() => setUseSimpleInterface(true)}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Use Simple Interface
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    >
      <Suspense 
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-8 flex items-center justify-center">
            <Card className="bg-slate-800/60 border-slate-700/50 p-8">
              <CardContent className="text-center text-white">
                <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading admin dashboard...</p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <EnhancedAdminDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}