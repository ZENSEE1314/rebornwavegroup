// The page shell (index.html) is written for Reborn: its title, description, share picture,
// tab icon and install details. A page opened for another company, or for BridgeX itself,
// gets that brand's own head instead — before any script runs, and for link previews.
import type { Request } from "express";

import { pool } from "./db";
import { DEFAULT_COMPANY_SLUG, IS_REBORN_DEPLOYMENT, currentTenant } from "./tenantContext";

interface PageBrand {
  title: string;
  description: string;
  iconUrl: string;
}

const COMPANY_PAGE = /^\/t\/([a-z0-9-]+)/i;
const BRIDGEX_HOST = /bridgexpos/i;
const BRIDGEX_BRAND: PageBrand = {
  title: "BridgeXPOS | White-label POS for every business",
  description: "Create a multi-branch POS, staff system, website and branded Android or iOS app for your company.",
  iconUrl: letterIcon("BX", "#22d3ee", "#06121d"),
};
const DEFAULT_ICON_COLOUR = "#1f2937";
const HEX_COLOUR = /^#[0-9a-f]{3,8}$/i;

function letterIcon(letters: string, fill: string, ink = "#ffffff"): string {
  const size = letters.length > 1 ? 32 : 36;
  return "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${fill}'/><text x='32' y='45' font-family='Arial,Helvetica,sans-serif' font-size='${size}' font-weight='bold' text-anchor='middle' fill='${ink}'>${letters}</text></svg>`,
  );
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function companyBrand(slug: string): Promise<PageBrand | null> {
  const found = await pool.query(`SELECT name, app_name, logo_url, theme FROM public.bridge_companies WHERE slug=$1 LIMIT 1`, [slug.toLowerCase()]);
  const company = found.rows[0];
  if (!company) return null;
  const name: string = company.app_name || company.name;
  const colour = HEX_COLOUR.test(company.theme?.primaryColor || "") ? company.theme.primaryColor : DEFAULT_ICON_COLOUR;
  const letter = name.trim().charAt(0).toUpperCase().replace(/[^A-Z0-9]/, "•");
  return { title: name, description: name, iconUrl: company.logo_url || letterIcon(letter, colour) };
}

// Whose page this is: a company's (its /t/<slug> page, its own domain, or the company this
// browser is in), BridgeX's on the BridgeX site, or null for Reborn's own.
async function brandForRequest(req: Request, flagshipHosts: Set<string>): Promise<PageBrand | null> {
  if (flagshipHosts.has(req.hostname)) return null;
  // This handler is mounted on "*", where req.path is always "/"; the real path is in originalUrl.
  const path = req.originalUrl.split("?")[0];
  if (path.startsWith("/bridgex")) return BRIDGEX_BRAND;
  const slug = COMPANY_PAGE.exec(path)?.[1] || currentTenant()?.slug || String(req.query.tenant || "") || (IS_REBORN_DEPLOYMENT ? "" : DEFAULT_COMPANY_SLUG);
  // Reborn's own slug keeps Reborn's page; on a company's own server the default company is that company.
  const isAnotherCompany = !!slug && (slug !== DEFAULT_COMPANY_SLUG || !IS_REBORN_DEPLOYMENT);
  const company = isAnotherCompany ? await companyBrand(slug) : null;
  if (company) return company;
  return BRIDGEX_HOST.test(req.hostname) ? BRIDGEX_BRAND : null;
}

function withBrand(html: string, brand: PageBrand): string {
  const title = escapeHtml(brand.title), description = escapeHtml(brand.description);
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta\s+(?:name|property)="(?:description|keywords|og:[^"]+|twitter:[^"]+|apple-mobile-web-app-title)"[\s\S]*?\/>\s*/g, "")
    .replace(/<link rel="(?:canonical|manifest|apple-touch-icon)"[^>]*>\s*/g, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "")
    .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${escapeHtml(brand.iconUrl)}" />`)
    .replace("</head>", `<meta name="description" content="${description}" /><meta property="og:title" content="${title}" /><meta property="og:site_name" content="${title}" /><meta property="og:description" content="${description}" /></head>`);
}

export async function brandPageShell(html: string, req: Request, flagshipHosts: Set<string>): Promise<string> {
  try {
    const brand = await brandForRequest(req, flagshipHosts);
    return brand ? withBrand(html, brand) : html;
  } catch (error) {
    console.error("[page] could not brand the page shell", error);
    return html;
  }
}
