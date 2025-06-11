import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [hasChecked, setHasChecked] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    throwOnError: false, // Never throw errors to prevent console logs
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (response.status === 401) {
          // Silently return null for unauthorized users
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        // Silently handle errors and return null
        return null;
      } finally {
        setHasChecked(true);
      }
    },
  });

  return {
    user,
    isLoading: !hasChecked && isLoading,
    isAuthenticated: !!user,
    error,
  };
}
