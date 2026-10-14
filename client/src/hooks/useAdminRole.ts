import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { AdminRole } from "@shared/adminTabs";

// The admin-page role of the signed-in account: admin, manager (a staff account whose company role is manager), staff or user.
export function useAdminRole(): AdminRole {
  const { user } = useAuth();
  const { data } = useQuery<{ role: AdminRole }>({ queryKey: ["/api/reborn/my-role"], queryFn: () => apiRequest("GET", "/api/reborn/my-role").then((r) => r.json()), enabled: !!user });
  return data?.role || ((user as { role?: string } | null | undefined)?.role === "admin" ? "admin" : "staff");
}

/** The main admin and managers may change products and stock; only the main admin deletes or merges them. */
export function useProductRights() {
  const role = useAdminRole();
  return { canEdit: role === "admin" || role === "manager", canDelete: role === "admin" };
}
