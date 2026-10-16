// The POS keeps selling when the internet is down: a quick sale is saved on the device and sent when the internet is back. The rules for that queue.
export interface OfflineSale {
  offlineId: string;                  // the sale's own id: sending it twice never makes two sales
  at: string;                         // ISO time the customer paid
  label: string;                      // what the cashier sees in the list, e.g. "3 items"
  total: number;
  payload: Record<string, unknown>;   // the sale request (items, payment…)
  failed?: string;                    // the server's reason when it refused the sale
}

export type SyncVerdict = "sent" | "rejected" | "login" | "retry-later";

export const MAX_OFFLINE_SALES = 500;
export const OFFLINE_SALES_KEY = "rw.pos.offlineSales";

/** What to do with a sale after the server's answer (status 0 = no answer at all). */
export function verdictFor(status: number): SyncVerdict {
  if (status >= 200 && status < 300) return "sent";
  if (status === 401) return "login";
  if ([400, 403, 404, 409, 422].includes(status)) return "rejected";
  return "retry-later";
}

export function parseQueue(raw: string | null): OfflineSale[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((sale) => sale && typeof sale.offlineId === "string" && sale.payload) : [];
  } catch { return []; }
}

export const addSale = (queue: OfflineSale[], sale: OfflineSale): OfflineSale[] => (queue.some((x) => x.offlineId === sale.offlineId) ? queue : [...queue, sale].slice(-MAX_OFFLINE_SALES));
export const removeSale = (queue: OfflineSale[], offlineId: string): OfflineSale[] => queue.filter((sale) => sale.offlineId !== offlineId);
export const markFailed = (queue: OfflineSale[], offlineId: string, message: string): OfflineSale[] => queue.map((sale) => (sale.offlineId === offlineId ? { ...sale, failed: message } : sale));
export const clearFailed = (queue: OfflineSale[], offlineId: string): OfflineSale[] => queue.map((sale) => { if (sale.offlineId !== offlineId) return sale; const { failed: _failed, ...rest } = sale; return rest; });
export const pendingSales = (queue: OfflineSale[]): OfflineSale[] => queue.filter((sale) => !sale.failed);
export const failedSales = (queue: OfflineSale[]): OfflineSale[] => queue.filter((sale) => !!sale.failed);
