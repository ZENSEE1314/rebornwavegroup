// The money of the company a request is in: its currency, symbol and decimals
// (shared/countries.ts). A company in its own data space carries its currency in the
// tenant registry; the platform's own company (Reborn, or a dedicated server's company)
// is read once at startup and again whenever the BridgeX console changes it.
import { currentTenant, DEFAULT_COMPANY_SLUG } from "./tenantContext";
import { formatMoneyIn, moneyStyle, roundMoneyTo, type MoneyStyle } from "@shared/countries";

let homeMoney: MoneyStyle = moneyStyle("IDR");
let homeCountry = "ID";

export async function loadHomeMoney() {
  try {
    const { pool } = await import("./db"); // loaded late: server/i18n.ts imports this file
    const r: any = await pool.query(`SELECT country, local_currency FROM public.bridge_companies WHERE slug=$1 LIMIT 1`, [DEFAULT_COMPANY_SLUG]);
    const row = (r.rows || r)[0];
    if (row) { homeMoney = moneyStyle(row.local_currency); homeCountry = String(row.country || "ID"); }
  } catch (error) {
    console.error("[money] could not read the home company's currency", error);
  }
}

export function companyMoney(): MoneyStyle {
  const t = currentTenant();
  return t?.currency ? moneyStyle(t.currency) : homeMoney;
}
export function companyCountry(): string {
  const t = currentTenant();
  return t ? t.country || "ID" : homeCountry;
}
// Round to what the company's currency can pay: whole rupiah, or cents.
export const roundMoney = (n: number) => roundMoneyTo(n, companyMoney().decimals);
export const formatMoney = (n: number) => formatMoneyIn(companyMoney(), n);
