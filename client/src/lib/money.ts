// The company's money in the app: currency symbol + decimals from its country
// (shared/countries.ts; set in App.tsx from the company lookup). Reborn and every
// Indonesian company show "RP 1,250,000"; a Singapore company "S$ 12.50".
import { formatMoneyIn, moneyStyle, roundMoneyTo, type MoneyStyle } from "@shared/countries";

let style: MoneyStyle = moneyStyle("IDR");
let locale = "en-US";

export function setAppMoney(currency?: string | null) { style = moneyStyle(currency); }
export function setMoneyLocale(tag: string) { locale = tag; }
export const appMoney = (): MoneyStyle => style;
export const moneySymbol = (): string => style.symbol;
// "RP 1,250,000" / "S$ 12.50"
export const money = (n: unknown): string => formatMoneyIn(style, Number(n) || 0, locale);
// Just the number: "1,250,000" / "12.50"
export const moneyAmount = (n: unknown): string => {
  const v = roundMoneyTo(Number(n) || 0, style.decimals);
  return v.toLocaleString(locale, { minimumFractionDigits: style.decimals, maximumFractionDigits: style.decimals });
};
// Round to what the currency can pay: whole rupiah, or cents.
export const roundMoney = (n: unknown): number => roundMoneyTo(Number(n) || 0, style.decimals);
// Step for amount inputs: 1 for rupiah, 0.01 for cents.
export const moneyStep = (): number => (style.decimals ? 1 / 10 ** style.decimals : 1);
