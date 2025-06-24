import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchInterval: false, // Disable auto-refresh for auth
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 30 * 1000, // 30 seconds stale time for faster auth updates
    gcTime: 0, // Don't cache auth data in garbage collection
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}
