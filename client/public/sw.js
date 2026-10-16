// Reborn Wave service worker — Web Push + notification click handling.
const ICON = "/icon-192.png";
const BADGE = "/icon-192.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((names) => Promise.all(names.filter((n) => n.startsWith("rw-") && ![SHELL, API].includes(n)).map((n) => caches.delete(n)))).then(() => self.clients.claim())
));

// ── Offline POS ─────────────────────────────────────────────────────────────
// The app shell, the built files (/assets, named by their content) and the few GET answers the POS needs are kept, so the POS opens and
// sells with no internet. Selling itself is queued by the page (client/src/lib/offline-sales.ts); nothing that writes is ever answered from here.
const SHELL = "rw-shell-v1";
const API = "rw-api-v1";
const SHELL_KEY = "/__shell";
const NAVIGATE_TIMEOUT_MS = 4000;
const API_TIMEOUT_MS = 5000;
const API_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHED_AT = "x-sw-cached-at";
// Only what the POS screens read: who is signed in, the company's money / role, the catalogue, staff, settings, stock and the bills.
const OFFLINE_API = [
  /^\/api\/auth\/user$/,
  /^\/api\/v1\/tenant\/resolve$/,
  /^\/api\/reborn\/my-role$/,
  /^\/api\/reborn\/pos\/(products|staff|settings|stock|orders|packages|bottle-keeps)$/,
];
const STATIC_FILE = /^\/(assets\/|icon-|apple-touch-icon)/;
const NOT_THE_APP = /^\/(api\/|\.well-known\/)/; // downloads, sign-in returns and the like are never answered with the saved page

function fetchWithin(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
async function stamped(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT, String(Date.now()));
  return new Response(await response.clone().blob(), { status: response.status, statusText: response.statusText, headers });
}
async function openShell(request) {
  const cache = await caches.open(SHELL);
  const saved = await cache.match(SHELL_KEY);
  try {
    // With a saved copy the page is not held up by a slow connection; without one the network is simply waited for.
    const response = saved ? await fetchWithin(request, NAVIGATE_TIMEOUT_MS) : await fetch(request);
    if (response.ok) cache.put(SHELL_KEY, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    return saved || Response.error();
  }
}
async function freshOrSaved(request) {
  const cache = await caches.open(API);
  try {
    const response = await fetchWithin(request, API_TIMEOUT_MS);
    if (response.ok) cache.put(request, await stamped(response)).catch(() => {});
    return response;
  } catch (error) {
    const saved = await cache.match(request, { ignoreVary: true });
    if (saved && Date.now() - Number(saved.headers.get(CACHED_AT) || 0) < API_MAX_AGE_MS) return saved;
    throw error;
  }
}
async function savedFirst(request) {
  const cache = await caches.open(SHELL);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") { if (NOT_THE_APP.test(url.pathname)) return; return event.respondWith(openShell(request)); }
  if (OFFLINE_API.some((pattern) => pattern.test(url.pathname))) return event.respondWith(freshOrSaved(request));
  if (STATIC_FILE.test(url.pathname)) return event.respondWith(savedFirst(request));
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  // The POS page lists the files it already loaded, so the next visit works offline even if this was the first one.
  if (message.type === "prime" && Array.isArray(message.urls)) {
    event.waitUntil(caches.open(SHELL).then(async (cache) => {
      await fetch("/").then((response) => { if (response.ok) return cache.put(SHELL_KEY, response); }).catch(() => {});
      await Promise.all(message.urls.map((u) => cache.add(u).catch(() => {})));
    }));
  }
  if (message.type === "clear-api") event.waitUntil(caches.delete(API));
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: "Reborn Wave", body: event.data && event.data.text() }; }
  const title = data.title || "Reborn Wave";
  const options = {
    body: data.body || "",
    icon: ICON,
    badge: BADGE,
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/reborn" },
    vibrate: data.urgent ? [600, 200, 600, 200, 600, 200, 600] : [80, 40, 80],
    requireInteraction: !!data.urgent,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/reborn";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
