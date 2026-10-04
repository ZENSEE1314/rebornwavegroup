// Countries a company can be in. The country sets the company's money (currency, its
// symbol, how many decimals) and the statutory payroll contributions its staff pay
// (shared/payrollRules.ts). Reborn and every older company are in Indonesia (IDR).
export interface Country {
  code: string;            // ISO 3166-1 alpha-2
  name: { en: string; zh: string; id: string };
  currency: string;        // ISO 4217
  symbol: string;          // shown in front of amounts
  decimals: number;        // 0 = whole amounts (IDR), 2 = cents (SGD)
  timezone: string;
}

export const COUNTRIES: Country[] = [
  { code: "ID", name: { en: "Indonesia", zh: "印度尼西亚", id: "Indonesia" }, currency: "IDR", symbol: "RP", decimals: 0, timezone: "Asia/Jakarta" },
  { code: "SG", name: { en: "Singapore", zh: "新加坡", id: "Singapura" }, currency: "SGD", symbol: "S$", decimals: 2, timezone: "Asia/Singapore" },
  { code: "MY", name: { en: "Malaysia", zh: "马来西亚", id: "Malaysia" }, currency: "MYR", symbol: "RM", decimals: 2, timezone: "Asia/Kuala_Lumpur" },
  { code: "TH", name: { en: "Thailand", zh: "泰国", id: "Thailand" }, currency: "THB", symbol: "฿", decimals: 2, timezone: "Asia/Bangkok" },
  { code: "PH", name: { en: "Philippines", zh: "菲律宾", id: "Filipina" }, currency: "PHP", symbol: "₱", decimals: 2, timezone: "Asia/Manila" },
  { code: "VN", name: { en: "Vietnam", zh: "越南", id: "Vietnam" }, currency: "VND", symbol: "₫", decimals: 0, timezone: "Asia/Ho_Chi_Minh" },
  { code: "CN", name: { en: "China", zh: "中国", id: "Tiongkok" }, currency: "CNY", symbol: "¥", decimals: 2, timezone: "Asia/Shanghai" },
  { code: "HK", name: { en: "Hong Kong", zh: "中国香港", id: "Hong Kong" }, currency: "HKD", symbol: "HK$", decimals: 2, timezone: "Asia/Hong_Kong" },
  { code: "TW", name: { en: "Taiwan", zh: "中国台湾", id: "Taiwan" }, currency: "TWD", symbol: "NT$", decimals: 0, timezone: "Asia/Taipei" },
  { code: "JP", name: { en: "Japan", zh: "日本", id: "Jepang" }, currency: "JPY", symbol: "¥", decimals: 0, timezone: "Asia/Tokyo" },
  { code: "KR", name: { en: "South Korea", zh: "韩国", id: "Korea Selatan" }, currency: "KRW", symbol: "₩", decimals: 0, timezone: "Asia/Seoul" },
  { code: "IN", name: { en: "India", zh: "印度", id: "India" }, currency: "INR", symbol: "₹", decimals: 2, timezone: "Asia/Kolkata" },
  { code: "AU", name: { en: "Australia", zh: "澳大利亚", id: "Australia" }, currency: "AUD", symbol: "A$", decimals: 2, timezone: "Australia/Sydney" },
  { code: "AE", name: { en: "United Arab Emirates", zh: "阿联酋", id: "Uni Emirat Arab" }, currency: "AED", symbol: "AED", decimals: 2, timezone: "Asia/Dubai" },
  { code: "GB", name: { en: "United Kingdom", zh: "英国", id: "Inggris" }, currency: "GBP", symbol: "£", decimals: 2, timezone: "Europe/London" },
  { code: "US", name: { en: "United States", zh: "美国", id: "Amerika Serikat" }, currency: "USD", symbol: "$", decimals: 2, timezone: "America/New_York" },
];

export const DEFAULT_COUNTRY = "ID";
export const countryOf = (code?: string | null): Country =>
  COUNTRIES.find((c) => c.code === String(code || "").toUpperCase()) || COUNTRIES[0];

// Money settings of a currency code (a company can keep a currency other than its
// country's, e.g. a Batam company that prices in SGD).
export interface MoneyStyle { currency: string; symbol: string; decimals: number }
export function moneyStyle(currency?: string | null): MoneyStyle {
  const code = String(currency || "IDR").toUpperCase();
  const c = COUNTRIES.find((x) => x.currency === code);
  return { currency: code, symbol: c?.symbol || code, decimals: c ? c.decimals : 2 };
}

// Round an amount the way the currency is paid: whole rupiah, cents for dollars.
export function roundMoneyTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((Number(n) || 0) * f) / f;
}

// "RP 1,250,000" / "S$ 12.50"
export function formatMoneyIn(style: MoneyStyle, n: number, locale = "en-US"): string {
  const v = roundMoneyTo(n, style.decimals);
  return `${style.symbol} ${v.toLocaleString(locale, { minimumFractionDigits: style.decimals, maximumFractionDigits: style.decimals })}`;
}
