import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    refetch,
  };
}
