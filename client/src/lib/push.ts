// Web Push client helpers — register the service worker and manage the subscription.
import { apiRequest } from "./queryClient";

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// On iOS, web push only works when the site is installed to the Home Screen.
export function isStandalone(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function iosNeedsInstall(): boolean {
  return isIos() && !isStandalone();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  return Notification.permission;
}

// Ask permission (if needed), subscribe, and register the subscription with the server.
// Returns true when the device is subscribed and will receive push.
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (iosNeedsInstall()) return { ok: false, reason: "ios-install" };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "no-sw" };
  await navigator.serviceWorker.ready;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const res = await apiRequest("GET", "/api/reborn/push/public-key").then((r) => r.json());
  if (!res?.enabled || !res?.key) return { ok: false, reason: "server-off" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(res.key),
    });
  }
  await apiRequest("POST", "/api/reborn/push/subscribe", { subscription: sub.toJSON() });
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await apiRequest("POST", "/api/reborn/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}

export async function sendTestPush(): Promise<number> {
  const r = await apiRequest("POST", "/api/reborn/push/test", {}).then((x) => x.json());
  return r?.sent ?? 0;
}

// Already granted + subscribed on this device?
export async function isPushActive(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
