import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SimpleAdminDashboard() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-purple-900 flex items-center justify-center">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-slate-800/60 border-slate-700/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Admin Dashboard</CardTitle>
            <p className="text-gray-300">Welcome back, {user?.firstName}!</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">Online</div>
                  <p className="text-xs text-gray-400 mt-1">All systems operational</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">6</div>
                  <p className="text-xs text-gray-400 mt-1">Template types available</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Banner Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">Active</div>
                  <p className="text-xs text-gray-400 mt-1">Content management ready</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <Button 
                onClick={() => window.location.href = '/admin'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Access Full Admin Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}