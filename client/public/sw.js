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
const SHELL = "rw-shell-v3"; // a new name drops the pages and files saved by an older version
const API = "rw-api-v1";
const SHELL_KEY = "/__shell";
// A copy of the server running on a PC at the venue (localhost) reaches the cloud database over a slow line: wait much longer there before showing the saved copy as "no internet".
const IS_LOCAL_COPY = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";
// The saved copy is shown only after the wait: long when the device says it is online (a slow line, not "no internet"), short when it says it is offline.
const ONLINE_WAIT_MS = 25000;
const OFFLINE_WAIT_MS = 3000;
const waitMs = () => (IS_LOCAL_COPY ? 60000 : self.navigator.onLine ? ONLINE_WAIT_MS : OFFLINE_WAIT_MS);
const API_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const CACHED_AT = "x-sw-cached-at";
// Every page of the app can be opened offline: the last answer of each read (GET) is kept for 3 days and shown when the network is down.
// Never kept: sign-in / password calls, live streams, member look-ups, chats, contracts / ID / payslips, files and codes.
const API_MAX_ENTRIES = 300;
const API_MAX_BYTES = 1500000;
const NEVER_KEEP = /^\/api\/(auth\/(?!user$)|logout|karaoke|tv\/|venue-bridge|meta|whatsapp|telegram|client-error|health$|reborn\/(song-queue-info|venue\/status))|\/(stream|token|tokens|secret|password|pdf|qr|download|export|backups?|invite|contracts|my-employment|payslips|staff-hr|crm|chat|messages)(\/|$)|\/pos\/member(s|\/)?|\/id\//i;
const STATIC_FILE = /^\/(assets\/|icon-|apple-touch-icon)/;
const NOT_THE_APP = /^\/(api\/|\.well-known\/|reset$|overlay)/; // downloads, sign-in returns and the like are never answered with the saved page

function fetchWithin(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
// The page is told when an answer is the saved one (header x-sw-saved), so it can say "no internet" even though the request got an answer.
async function markSaved(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sw-saved", "1");
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
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
    const response = saved ? await fetchWithin(request, waitMs()) : await fetch(request);
    if (response.ok) cache.put(SHELL_KEY, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    return saved || Response.error();
  }
}
// Keep the saved answers from growing forever: the oldest go first.
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > API_MAX_ENTRIES) await Promise.all(keys.slice(0, keys.length - API_MAX_ENTRIES).map((key) => cache.delete(key)));
}
async function freshOrSaved(request) {
  const cache = await caches.open(API);
  try {
    const response = await fetchWithin(request, waitMs());
    const size = Number(response.headers.get("content-length") || 0);
    if (response.ok && /json/i.test(response.headers.get("content-type") || "") && size < API_MAX_BYTES) {
      await cache.put(request, await stamped(response)).catch(() => {});
      trim(cache).catch(() => {});
    }
    return response;
  } catch (error) {
    const saved = await cache.match(request, { ignoreVary: true });
    if (saved && Date.now() - Number(saved.headers.get(CACHED_AT) || 0) < API_MAX_AGE_MS) return markSaved(saved);
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
  if (url.pathname.startsWith("/api/") && !NEVER_KEEP.test(url.pathname) && !(request.headers.get("accept") || "").includes("text/event-stream")) return event.respondWith(freshOrSaved(request));
  if (STATIC_FILE.test(url.pathname)) return event.respondWith(savedFirst(request));
});

self.addEventListener("message", (event) => {
  const message = event.data || {};
  // The POS page lists the files it already loaded, so the next visit works offline even if this was the first one.
  if (message.type === "prime" && Array.isArray(message.urls)) {
    event.waitUntil(caches.open(SHELL).then(async (cache) => {
      await fetch("/").then((response) => { if (response.ok) return cache.put(SHELL_KEY, response); }).catch(() => {});
      await Promise.all(message.urls.map(async (u) => { if (!(await cache.match(u))) await cache.add(u).catch(() => {}); }));
    }));
  }
  if (message.type === "clear-api") event.waitUntil(caches.delete(API));
  // The "Couldn't load this page" Retry: forget the saved pages and files so the next load is the newest version.
  if (message.type === "clear-shell") event.waitUntil(caches.delete(SHELL));
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
