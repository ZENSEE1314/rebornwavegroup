import { useQuery } from "@tanstack/react-query";

export interface TenantBrand {
  id: number;
  slug?: string;
  name: string;
  app_name?: string;
  logo_url?: string;
  theme?: { primaryColor?: string; accentColor?: string; skin?: string };
}

export const FLAGSHIP_TENANT_SLUG = "reborn-wave-group";
const TENANT_SLUG_KEY = "bridgexTenantSlug";
const TENANT_COOKIE = "bx_tenant";
const ONE_YEAR_S = 365 * 24 * 60 * 60;

// Remember which business this browser is in. The cookie rides on every request (images,
// live streams, plain fetches) so the server can keep all of them in that business's data.
export function rememberTenantSlug(slug: string) {
  const value = slug.toLowerCase();
  try { localStorage.setItem(TENANT_SLUG_KEY, value); } catch {}
  document.cookie = `${TENANT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_S}; SameSite=Lax`;
}

// Leaving a business (opening BridgeX itself): this browser is no longer inside it.
export function forgetTenantSlug() {
  try { localStorage.removeItem(TENANT_SLUG_KEY); } catch {}
  document.cookie = `${TENANT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

// The business this visitor entered through: `?tenant=<slug>` (app start URL) wins and
// is remembered, otherwise the last /t/<slug> they opened.
export function rememberedTenantSlug(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("tenant");
    if (fromUrl) rememberTenantSlug(fromUrl);
    const slug = localStorage.getItem(TENANT_SLUG_KEY) || "";
    // Browsers that entered before the cookie existed get it on their next visit.
    if (slug && !document.cookie.includes(`${TENANT_COOKIE}=`)) rememberTenantSlug(slug);
    return slug;
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
    skin: data?.theme?.skin || "",
  };
}
