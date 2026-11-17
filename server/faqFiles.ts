import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { Express, Request, RequestHandler, Response } from "express";
import { faqFiles, faqItems } from "@shared/schema";
import { FAQ_FILE_MAX_BYTES, FAQ_FILES_PER_ITEM, cleanFileName, isImageMime, isInlineMime, mimeFor, parseLink, parseUpload } from "@shared/faqFileRules";
import { db } from "./db";

export { FAQ_FILE_MAX_BYTES, isImageMime };

const DOWNLOAD_PATH = "/api/faq-files";
// A list reads these columns only: `data` is the whole file.
const LIST_COLUMNS = { id: faqFiles.id, faqId: faqFiles.faqId, token: faqFiles.token, name: faqFiles.name, mime: faqFiles.mime, size: faqFiles.size, url: faqFiles.url };
export type FaqFileRow = { id: number; faqId: number; token: string; name: string; mime: string; size: number; url: string | null };
export interface FaqFileView { id: number; name: string; mime: string; size: number; isImage: boolean; isLink: boolean; href: string }

export const downloadPath = (row: Pick<FaqFileRow, "token" | "name">) => `${DOWNLOAD_PATH}/${row.token}/${encodeURIComponent(row.name)}`;

export function viewOf(row: FaqFileRow): FaqFileView {
  return { id: row.id, name: row.name, mime: row.mime, size: row.size, isImage: isImageMime(row.mime), isLink: !!row.url, href: row.url || downloadPath(row) };
}

export async function filesOf(faqIds: number[]): Promise<Map<number, FaqFileRow[]>> {
  const byFaq = new Map<number, FaqFileRow[]>();
  if (!faqIds.length) return byFaq;
  const rows = await db.select(LIST_COLUMNS).from(faqFiles).where(inArray(faqFiles.faqId, faqIds)).orderBy(faqFiles.id);
  for (const row of rows) byFaq.set(row.faqId, [...(byFaq.get(row.faqId) || []), row]);
  return byFaq;
}

export async function withFileViews<T extends { id: number }>(items: T[]): Promise<Array<T & { files: FaqFileView[] }>> {
  const byFaq = await filesOf(items.map((item) => item.id));
  return items.map((item) => ({ ...item, files: (byFaq.get(item.id) || []).map(viewOf) }));
}

export async function fileBytes(id: number): Promise<Buffer | null> {
  const [row] = await db.select({ data: faqFiles.data }).from(faqFiles).where(eq(faqFiles.id, id));
  return row?.data ? Buffer.from(row.data, "base64") : null;
}

export async function removeFilesOf(faqId: number) {
  await db.delete(faqFiles).where(eq(faqFiles.faqId, faqId));
}

type RequireAdmin = (handler: (req: Request, res: Response) => unknown) => RequestHandler;
const failure = (res: Response, status: number, error: string) => res.status(status).json({ error });

export function registerFaqFiles(app: Express, requireAdmin: RequireAdmin) {
  // The file itself, for the chat apps and the member app: the secret in the address is the key.
  app.get(`${DOWNLOAD_PATH}/:token/:name?`, async (req, res) => {
    const [row] = await db.select().from(faqFiles).where(eq(faqFiles.token, String(req.params.token)));
    if (!row) return res.status(404).end();
    if (row.url) return res.redirect(row.url);
    const bytes = Buffer.from(row.data || "", "base64");
    res.set({
      "Content-Type": row.mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${isInlineMime(row.mime) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "X-Content-Type-Options": "nosniff", // an uploaded page must never run on our address
      "Cache-Control": "public, max-age=3600",
    });
    res.end(bytes);
  });

  app.post("/api/reborn/admin/faq/:id/files", requireAdmin(async (req, res) => {
    const faqId = Number(req.params.id);
    const [item] = await db.select({ id: faqItems.id }).from(faqItems).where(eq(faqItems.id, faqId));
    if (!item) return failure(res, 404, "noItem");
    const [{ count }] = [{ count: ((await filesOf([faqId])).get(faqId) || []).length }];
    if (count >= FAQ_FILES_PER_ITEM) return failure(res, 400, "tooMany");
    const token = randomBytes(18).toString("base64url");
    if (req.body?.url) {
      const link = parseLink(req.body);
      if ("error" in link) return failure(res, 400, link.error);
      const [row] = await db.insert(faqFiles).values({ faqId, token, name: link.name, mime: "text/uri-list", size: 0, url: link.url }).returning(LIST_COLUMNS);
      return res.json(viewOf(row));
    }
    const upload = parseUpload(req.body);
    if ("error" in upload) return failure(res, 400, upload.error);
    const [row] = await db.insert(faqFiles).values({ faqId, token, name: upload.name, mime: upload.mime, size: upload.data.length, data: upload.data.toString("base64") }).returning(LIST_COLUMNS);
    res.json(viewOf(row));
  }));

  app.delete("/api/reborn/admin/faq/files/:fileId", requireAdmin(async (req, res) => {
    await db.delete(faqFiles).where(eq(faqFiles.id, Number(req.params.fileId)));
    res.json({ ok: true });
  }));
}
