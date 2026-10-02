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
  
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (e: any) {
    if (method !== "GET") reportClientError(method, url, e?.message || "Network error");
    throw e;
  }

  await throwIfResNotOk(res);
  return res;
}

// Error watch (Admin › Errors): a song request / booking / POS / order call that
// never reached the server is reported once the phone is back online.
const pendingClientErrors: Array<Record<string, string>> = [];
function flushClientErrors() {
  while (pendingClientErrors.length) {
    const body = pendingClientErrors.shift()!;
    fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" }).catch(() => {});
  }
}
function reportClientError(method: string, url: string, message: string) {
  if (!/^\/api\/reborn\/(song|admin\/song|booking|my-bookings|admin\/bookings|pos|admin\/pos|shop|venue\/checkin)/.test(url)) return;
  if (pendingClientErrors.length < 20) pendingClientErrors.push({ method, path: url, message, agent: navigator.userAgent });
  if (navigator.onLine) setTimeout(flushClientErrors, 3000);
}
if (typeof window !== "undefined") window.addEventListener("online", () => setTimeout(flushClientErrors, 2000));

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
