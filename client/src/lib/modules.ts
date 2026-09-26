import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// Feature flags come from the club's BridgeX company modules (bridge_company_modules).
// A BridgeX customer ticks these in /bridgex › Services; the app then only shows
// the enabled ones. Keys match BRIDGEX_MODULES on the server.

// Which admin tab requires which BridgeX module (tabs not listed are always shown).
export const ADMIN_TAB_MODULE: Record<string, string> = {
  Bookings: "booking",
  Requests: "song_requests", Songs: "song_requests",
  Bottles: "bottle_keep",
  Products: "pos", Inventory: "inventory", Accounting: "accounting",
  Staff: "employees", Payroll: "payroll",
  CRM: "ai_whatsapp",
};

// Which member nav path requires which module (paths not listed are always shown).
export const NAV_MODULE: Record<string, string> = {
  "/order": "pos",
  "/bottles": "bottle_keep",
  "/bookings": "booking",
  "/songs": "song_requests",
  "/games": "games",
};

// default: a module is ON unless explicitly disabled. If we have no data yet
// (undefined), treat everything as on so nothing flickers/hides during load.
export function moduleEnabled(modules: Record<string, boolean> | undefined, key?: string): boolean {
  if (!key || !modules) return true;
  return modules[key] !== false;
}

export function useModules() {
  const { data } = useQuery<any>({
    queryKey: ["/api/reborn/modules"],
    queryFn: () => apiRequest("GET", "/api/reborn/modules").then((r) => r.json()),
    staleTime: 60_000,
  });
  return (data?.modules || undefined) as Record<string, boolean> | undefined;
}
