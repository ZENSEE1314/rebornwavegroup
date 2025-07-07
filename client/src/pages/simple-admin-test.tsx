import { useAuth } from "@/hooks/useAuth";

export default function SimpleAdminTest() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="p-8">Not authenticated. Please login first.</div>;
  }

  if (user?.role !== 'admin') {
    return <div className="p-8">Access denied. Admin role required.</div>;
  }

  return (
    <div className="min-h-screen bg-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard Test</h1>
        
        <div className="bg-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
          <div className="space-y-2 text-white">
            <p>Name: {user?.firstName} {user?.lastName}</p>
            <p>Email: {user?.email}</p>
            <p>Role: {user?.role}</p>
            <p>User ID: {user?.id}</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Admin Dashboard Status</h2>
          <p className="text-green-300">✅ Admin authentication working</p>
          <p className="text-green-300">✅ Admin page accessible</p>
          <p className="text-green-300">✅ Role-based access control functional</p>
          
          <div className="mt-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Go Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}