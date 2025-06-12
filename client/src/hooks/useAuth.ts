import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchInterval: false, // Disable auto-refresh for auth
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
