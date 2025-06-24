import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: false, // Disable auto-refresh for auth
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 1 * 60 * 1000, // Reduce stale time to 1 minute for faster auth updates
    gcTime: 0, // Don't cache auth data in garbage collection
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}
