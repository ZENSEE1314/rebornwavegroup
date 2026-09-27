import { useQuery } from "@tanstack/react-query";

export interface TenantBrand {
  id: number;
  name: string;
  app_name?: string;
  logo_url?: string;
  theme?: { primaryColor?: string; accentColor?: string };
}

// Resolves this app instance's business (by domain, or the /t/<slug> the member
// entered) so the member app shows that business's name, logo and colours.
// Defaults to the flagship Reborn company on the main host.
export function useTenantBrand() {
  const { data } = useQuery<TenantBrand | null>({
    queryKey: ["tenant-brand"],
    queryFn: async () => {
      let slug = ""; try { slug = localStorage.getItem("bridgexTenantSlug") || ""; } catch {}
      const r = await fetch(`/api/v1/tenant/resolve?host=${encodeURIComponent(location.hostname)}&slug=${encodeURIComponent(slug)}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 10 * 60_000,
  });
  return {
    appName: data?.app_name || data?.name || "",
    logoUrl: data?.logo_url || "",
    primary: data?.theme?.primaryColor || "",
    accent: data?.theme?.accentColor || "",
  };
}
