// POS offline mode: a quick sale made without internet is saved on this device and sent when the internet is back.
// The queue rules are in shared/offlineSale.ts; this file keeps it in the browser's storage, sends it, and gives the screen its numbers.
import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { translate } from "@/lib/i18n";
import { rememberedTenantSlug } from "@/hooks/useTenantBrand";
import { OFFLINE_SALES_KEY, addSale, clearFailed, failedSales, markFailed, parseQueue, pendingSales, removeSale, verdictFor, type OfflineSale } from "@shared/offlineSale";

const SALE_URL = "/api/reborn/pos/sale";
const SALE_TIMEOUT_MS = 15_000;
const SYNC_EVERY_MS = 30_000;
const RECEIPT_META_KEY = "rw.pos.receiptMeta";

let queue: OfflineSale[] = [];
let looksOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
let needsLogin = false;
let isSyncing = false;
let snapshot = { queue, looksOffline, needsLogin, isSyncing };
const listeners = new Set<() => void>();

function publish() {
  snapshot = { queue, looksOffline, needsLogin, isSyncing };
  listeners.forEach((listener) => listener());
}
function load() {
  try { queue = parseQueue(localStorage.getItem(OFFLINE_SALES_KEY)); } catch { queue = []; }
  snapshot = { queue, looksOffline, needsLogin, isSyncing };
}
function save(next: OfflineSale[]) {
  queue = next;
  try { localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(queue)); } catch { /* storage full or blocked: the queue still lives in memory this visit */ }
  publish();
}
if (typeof window !== "undefined") {
  load();
  window.addEventListener("online", () => { looksOffline = false; publish(); });
  window.addEventListener("offline", () => { looksOffline = true; publish(); });
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

function saleHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const slug = rememberedTenantSlug();
  if (slug) headers["X-Tenant-Slug"] = slug;
  try { const lang = localStorage.getItem("language"); if (lang) headers["X-Lang"] = lang; } catch { /* no language saved */ }
  return headers;
}

async function sendSale(sale: Pick<OfflineSale, "offlineId" | "at" | "payload">): Promise<Response | null> {
  try {
    return await fetch(SALE_URL, { method: "POST", headers: saleHeaders(), credentials: "include", body: JSON.stringify({ ...sale.payload, offlineId: sale.offlineId, offlineAt: sale.at }), signal: AbortSignal.timeout(SALE_TIMEOUT_MS) });
  } catch { return null; }
}
const messageOf = async (res: Response | null) => (res ? (await res.json().catch(() => ({})))?.message : "") || translate("pos.failed");

export type SaleOutcome = { queued: false; data: any } | { queued: true; sale: OfflineSale };

/** Sell now; if the server can't be reached the sale is saved on this device instead (the same sale is never counted twice). */
export async function submitSale(payload: Record<string, unknown>, meta: { label: string; total: number }): Promise<SaleOutcome> {
  const sale: OfflineSale = { offlineId: newId(), at: new Date().toISOString(), label: meta.label, total: meta.total, payload };
  const res = await sendSale(sale);
  const verdict = verdictFor(res?.status ?? 0);
  if (verdict === "sent") {
    looksOffline = false; publish();
    const data = await res!.json();
    if (data?.receipt) rememberReceiptMeta(data.receipt);
    return { queued: false, data };
  }
  if (verdict === "rejected") throw new Error(await messageOf(res));
  if (verdict === "login") throw new Error(translate("pos.offline.loginAgain"));
  save(addSale(queue, sale));
  looksOffline = true; publish();
  return { queued: true, sale };
}

/** Send the waiting sales in order. Stops at the first sale the server can't be reached for; a refused sale is set aside with the reason. */
export async function syncOfflineSales(): Promise<number> {
  if (isSyncing) return 0;
  isSyncing = true; needsLogin = false; publish();
  let sent = 0;
  try {
    for (const sale of pendingSales(queue)) {
      const res = await sendSale(sale);
      const verdict = verdictFor(res?.status ?? 0);
      if (verdict === "sent") { save(removeSale(queue, sale.offlineId)); sent += 1; continue; }
      if (verdict === "rejected") { save(markFailed(queue, sale.offlineId, await messageOf(res))); continue; }
      if (verdict === "login") needsLogin = true;
      if (verdict === "retry-later") looksOffline = true;
      break;
    }
  } finally { isSyncing = false; publish(); }
  return sent;
}

export const discardOfflineSale = (offlineId: string) => save(removeSale(queue, offlineId));
export const retryOfflineSale = (offlineId: string) => save(clearFailed(queue, offlineId));

// The receipt's shop name / footer / logo, remembered from the last online sale so an offline receipt looks the same.
export function rememberReceiptMeta(meta: Record<string, unknown>) {
  try { localStorage.setItem(RECEIPT_META_KEY, JSON.stringify(meta)); } catch { /* not saved */ }
}
export function savedReceiptMeta(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(RECEIPT_META_KEY) || "{}"); } catch { return {}; }
}

/** Open the POS offline-ready: start the service worker and let it keep the files this page already loaded (do it once while online). */
export async function prepareOfflinePos() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const urls = performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => { try { const u = new URL(name); return u.origin === location.origin && /^\/(assets\/|icon-)/.test(u.pathname); } catch { return false; } });
    (registration.active || navigator.serviceWorker.controller)?.postMessage({ type: "prime", urls: Array.from(new Set(urls)) });
  } catch { /* no service worker here: the POS still works online */ }
}

/** On logout: the saved answers (catalogue, who was signed in) are removed from this device. Sales still waiting stay until they are sent. */
export function forgetOfflineData() {
  try { navigator.serviceWorker?.controller?.postMessage({ type: "clear-api" }); localStorage.removeItem(RECEIPT_META_KEY); } catch { /* nothing saved */ }
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;

/** Numbers for the POS screen; also sends the waiting sales when the internet returns, every 30 s while any wait, and when the screen opens. */
export function useOfflineSales() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const qc = useQueryClient();
  const pending = pendingSales(state.queue).length;
  const syncNow = async () => {
    const sent = await syncOfflineSales();
    if (sent > 0) ["/api/reborn/pos/products", "/api/reborn/pos/orders", "/api/reborn/pos/stock"].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
  };
  useEffect(() => {
    if (pending > 0) void syncNow();
    const onOnline = () => { void syncNow(); };
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => { if (pendingSales(queue).length > 0) void syncNow(); }, SYNC_EVERY_MS);
    return () => { window.removeEventListener("online", onOnline); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { isOffline: state.looksOffline, needsLogin: state.needsLogin, isSyncing: state.isSyncing, pending, failed: failedSales(state.queue), syncNow };
}
