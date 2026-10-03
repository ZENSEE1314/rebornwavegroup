import type { Request } from "express";
import { db } from "./db";
import { bridgeCompanies } from "@shared/schema";
import { eq } from "drizzle-orm";
import { currentTenant, homeCompanySlug } from "./tenantContext";

// Shared multi-tenant resolver (same rules as rebornGame's companyForReq) so any
// module can scope by the current business. Header → custom domain → Reborn default.
const cache = new Map<string, { row: any; at: number }>();
// The home company of each data space (Reborn on the platform, the tenant in its own space), by slug.
const homeCache = new Map<string, { row: any; at: number }>();

async function rebornDefault() {
  const rebornCache = homeCache.get(homeCompanySlug());
  if (rebornCache && Date.now() - rebornCache.at < 60000) return rebornCache.row;
  const row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, homeCompanySlug())).limit(1))[0] || null;
  homeCache.set(homeCompanySlug(), { row, at: Date.now() });
  return row;
}

// Default business id for work that has no HTTP request (e.g. WhatsApp bot).
export async function defaultCompanyId(): Promise<number | null> {
  const row = await rebornDefault();
  return row?.id ?? null;
}

export async function resolveCompany(req: Request) {
  // Inside a company's own data space there is exactly one company: its own.
  if (currentTenant()) return rebornDefault();
  const slug = String(req.header("x-tenant-slug") || "").toLowerCase().trim();
  const idHdr = Number(req.header("x-tenant-id")) || 0;
  const host = String(req.hostname || "").toLowerCase().split(":")[0];
  const isPlatformHost = !host || host === "localhost" || host.endsWith("railway.app") || host.endsWith("rebornwave.group");
  const key = idHdr ? `id:${idHdr}` : slug ? `slug:${slug}` : `host:${host}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60000) return hit.row;
  let row: any = null;
  if (idHdr) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.id, idHdr)).limit(1))[0];
  if (!row && slug) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.slug, slug)).limit(1))[0];
  if (!row && host && !isPlatformHost) row = (await db.select().from(bridgeCompanies).where(eq(bridgeCompanies.websiteDomain, host)).limit(1))[0];
  if (!row) row = await rebornDefault();
  cache.set(key, { row, at: Date.now() });
  return row || null;
}

export async function resolveCompanyId(req: Request): Promise<number> {
  const c = await resolveCompany(req);
  return c?.id || 0;
}
