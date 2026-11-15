// A "sleeping partner": an admin account the main admin marked view only. It sees everything an admin sees, but every change (any POST / PUT / PATCH / DELETE)
// is refused here, before a route runs, so accounts, sales, stock, staff and settings cannot be touched from that login.
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { tr } from "./i18n";
import { isWriteForbiddenToPartner } from "@shared/viewOnly";

const PARTNER_ADMINS_KEY = "partnerAdmins";
const CACHE_MS = 15_000;
const cache = new Map<string, { at: number; isPartner: boolean }>();

export async function partnerAdminIds(): Promise<string[]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, PARTNER_ADMINS_KEY)).limit(1);
  try {
    const list = JSON.parse(row?.value || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export async function isPartnerAdmin(userId: string): Promise<boolean> {
  const known = cache.get(userId);
  if (known && Date.now() - known.at < CACHE_MS) return known.isPartner;
  const isPartner = (await partnerAdminIds()).includes(userId);
  cache.set(userId, { at: Date.now(), isPartner });
  return isPartner;
}

export async function setPartnerAdmin(userId: string, isPartner: boolean): Promise<void> {
  const ids = await partnerAdminIds();
  if (ids.includes(userId) === isPartner) return;
  const value = JSON.stringify(isPartner ? [...ids, userId] : ids.filter((id) => id !== userId));
  await db.insert(appSettings).values({ key: PARTNER_ADMINS_KEY, value, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  cache.delete(userId);
}

export async function viewOnlyGuard(req: Request, res: Response, next: NextFunction) {
  const path = req.originalUrl.split("?")[0];
  if (!isWriteForbiddenToPartner(req.method, path)) return next();
  const user = (req as any).user;
  const userId: string | null = user?.claims?.sub || user?.id || null;
  if (!userId) return next();
  try {
    if (!(await isPartnerAdmin(userId))) return next();
  } catch (error) {
    console.error("[view-only] could not check the account", error);
    return next();
  }
  return res.status(403).json({ message: tr(req, { en: "View only: this account can see everything but cannot change anything.", zh: "仅限查看：此账号可以查看所有内容，但不能更改任何内容。", id: "Hanya lihat: akun ini dapat melihat semuanya tetapi tidak dapat mengubah apa pun." }) });
}
