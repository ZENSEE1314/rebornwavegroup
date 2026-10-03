import { useQuery } from "@tanstack/react-query";

export interface TenantBrand {
  id: number;
  slug?: string;
  name: string;
  app_name?: string;
  logo_url?: string;
  theme?: { primaryColor?: string; accentColor?: string };
}

export const FLAGSHIP_TENANT_SLUG = "reborn-wave-group";
const TENANT_SLUG_KEY = "bridgexTenantSlug";

// The business this visitor entered through: `?tenant=<slug>` (app start URL) wins and
// is remembered, otherwise the last /t/<slug> they opened.
export function rememberedTenantSlug(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("tenant");
    if (fromUrl) localStorage.setItem(TENANT_SLUG_KEY, fromUrl.toLowerCase());
    return localStorage.getItem(TENANT_SLUG_KEY) || "";
  } catch {
    return "";
  }
}

// Resolves this app instance's business (by domain, or the /t/<slug> the member
// entered) so the member app shows that business's name, logo and colours.
// Defaults to the flagship Reborn company on the main host.
export function useTenantBrand() {
  const { data, isLoading } = useQuery<TenantBrand | null>({
    queryKey: ["tenant-brand"],
    queryFn: async () => {
      const slug = rememberedTenantSlug();
      const r = await fetch(`/api/v1/tenant/resolve?host=${encodeURIComponent(location.hostname)}&slug=${encodeURIComponent(slug)}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 10 * 60_000,
  });
  return {
    isLoading,
    slug: data?.slug || "",
    // Another business's app (white-label), as opposed to Reborn's own.
    isWhiteLabel: !!data?.slug && data.slug !== FLAGSHIP_TENANT_SLUG,
    appName: data?.app_name || data?.name || "",
    logoUrl: data?.logo_url || "",
    primary: data?.theme?.primaryColor || "",
    accent: data?.theme?.accentColor || "",
  };
}
