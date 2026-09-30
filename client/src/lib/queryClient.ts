import { translate } from "@/lib/i18n";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Show the server's own (translated) message, never a raw HTML error page
    // (e.g. Cloudflare's 502 page while the server restarts).
    let msg = text;
    try { const j = JSON.parse(text); if (j && typeof j.message === "string") msg = j.message; } catch {
      if (/<\s*(!doctype|html|head|body|div)\b/i.test(text) || res.status >= 502) msg = translate("srv.err.busy");
    }
    throw new Error(`${res.status}: ${msg}`);
  }
}

// Tell the server which business this app instance is for (set by /t/<slug>).
// Domain-based tenants resolve server-side from the host, so this is only needed
// for the shared host + slug access; absent = the default (Reborn) company.
function tenantHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  try { const slug = localStorage.getItem("bridgexTenantSlug"); if (slug) h["X-Tenant-Slug"] = slug; } catch {}
  // The app language, so server messages come back translated.
  try { const lang = localStorage.getItem("language"); if (lang) h["X-Lang"] = lang; } catch {}
  return h;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...tenantHeaders(),
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...tenantHeaders(),
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Disable auto-refresh by default
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
