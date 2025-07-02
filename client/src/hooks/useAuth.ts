import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 unauthorized errors
      if (error?.status === 401) return false;
      return failureCount < 2;
    },
    refetchInterval: false, // Disable auto-refresh for auth
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 60 * 1000, // 60 seconds stale time for better stability
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
  });

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear cache and redirect
      queryClient.clear();
      window.location.href = '/login';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    refetch,
    logout,
  };
}
