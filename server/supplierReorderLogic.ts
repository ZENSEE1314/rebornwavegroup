// "Ask the supplier when stock is low": which items are low, which supplier to ask, and the message. Nothing here sends
// anything — the admin always approves a drafted message first (server/supplierReorder.ts).
export type ReorderLang = "en" | "zh" | "id";

export interface ReorderItemSetup { at: number; qty: number }
export interface ReorderSetup { enabled: boolean; lang: ReorderLang; items: Record<string, ReorderItemSetup> }

export interface ProductLite { id: number; name: string; stock: number; supplierName: string; supplierPhone: string }
export interface RequestItem { productId: number; name: string; stock: number; qty: number }
export type RequestStatus = "pending" | "sent" | "failed" | "dismissed";
export interface ReorderRequest {
  id: string; supplierName: string; phone: string; items: RequestItem[]; message: string;
  status: RequestStatus; createdAt: string; decidedAt?: string; error?: string;
}

export const DEFAULT_LOW_AT = 5;
export const DEFAULT_ORDER_QTY = 24;
export const MAX_QTY = 100_000;
export const MAX_SETUP_ITEMS = 1000;
export const MAX_REQUESTS_KEPT = 60;
const HOUR_MS = 3_600_000;
export const SENT_COOLDOWN_MS = 72 * HOUR_MS;
export const DISMISSED_COOLDOWN_MS = 24 * HOUR_MS;
const LANGS: ReorderLang[] = ["en", "zh", "id"];

const wholeNumber = (value: unknown, fallback: number, max: number) => {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number >= 0 ? Math.min(number, max) : fallback;
};

export function cleanReorderSetup(raw: unknown): ReorderSetup {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items: Record<string, ReorderItemSetup> = {};
  const given = input.items && typeof input.items === "object" ? Object.entries(input.items as Record<string, unknown>) : [];
  for (const [id, value] of given.slice(0, MAX_SETUP_ITEMS)) {
    if (!/^\d{1,9}$/.test(id)) continue;
    const item = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    items[id] = { at: wholeNumber(item.at, DEFAULT_LOW_AT, MAX_QTY), qty: Math.max(1, wholeNumber(item.qty, DEFAULT_ORDER_QTY, MAX_QTY)) };
  }
  return { enabled: input.enabled === true, lang: LANGS.find((lang) => lang === input.lang) ?? "id", items };
}

export const cleanRequests = (raw: unknown): ReorderRequest[] => (Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === "string").slice(0, MAX_REQUESTS_KEPT) : []);

/** Is the item low and switched on, and not already being asked about (or asked recently)? */
export function itemNeedsAsking(product: ProductLite, setup: ReorderSetup, requests: ReorderRequest[], now: number): boolean {
  const item = setup.items[String(product.id)];
  if (!item || product.stock > item.at) return false;
  if (!product.supplierPhone.replace(/\D/g, "")) return false;
  return !requests.some((request) => {
    if (!request.items.some((line) => line.productId === product.id)) return false;
    if (request.status === "pending") return true;
    const decidedAt = new Date(request.decidedAt || request.createdAt).getTime();
    if (request.status === "sent") return now - decidedAt < SENT_COOLDOWN_MS;
    if (request.status === "dismissed") return now - decidedAt < DISMISSED_COOLDOWN_MS;
    return false; // a failed send may be asked again
  });
}

/** One request per supplier phone, listing every low item of that supplier. */
export function groupBySupplier(products: ProductLite[], setup: ReorderSetup): Array<{ supplierName: string; phone: string; items: RequestItem[] }> {
  const groups = new Map<string, { supplierName: string; phone: string; items: RequestItem[] }>();
  for (const product of products) {
    const phone = product.supplierPhone.replace(/[^\d]/g, "");
    const group = groups.get(phone) ?? { supplierName: product.supplierName, phone, items: [] };
    group.items.push({ productId: product.id, name: product.name, stock: product.stock, qty: setup.items[String(product.id)].qty });
    if (!group.supplierName && product.supplierName) group.supplierName = product.supplierName;
    groups.set(phone, group);
  }
  return [...groups.values()];
}

const TEXT = {
  id: { hello: (supplier: string) => `Halo ${supplier || "Pak/Bu"}, `, intro: (club: string) => `kami dari ${club}. Stok barang berikut hampir habis, mohon info ketersediaan dan harga untuk pemesanan:`, line: (i: RequestItem) => `• ${i.name} — ${i.qty} pcs (sisa ${i.stock})`, outro: "Mohon dikonfirmasi ya. Terima kasih 🙏" },
  en: { hello: (supplier: string) => `Hello ${supplier || "there"}, `, intro: (club: string) => `this is ${club}. The items below are running low — please confirm availability and prices for a new order:`, line: (i: RequestItem) => `• ${i.name} — ${i.qty} pcs (left: ${i.stock})`, outro: "Please confirm. Thank you 🙏" },
  zh: { hello: (supplier: string) => `${supplier || "您好"}，`, intro: (club: string) => `我们是${club}。以下商品库存不足，请确认是否有货及订购价格：`, line: (i: RequestItem) => `• ${i.name} — ${i.qty} 件（剩余 ${i.stock}）`, outro: "请确认，谢谢 🙏" },
};

/** The ready-made message (used when no AI is set up, and as the AI's fallback). */
export function templateMessage(lang: ReorderLang, club: string, supplierName: string, items: RequestItem[]): string {
  const text = TEXT[lang];
  return [`${text.hello(supplierName)}${text.intro(club)}`, ...items.map(text.line), "", text.outro].join("\n");
}
