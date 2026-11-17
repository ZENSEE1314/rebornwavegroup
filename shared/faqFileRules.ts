import { Buffer } from "node:buffer";

export const FAQ_FILE_MAX_BYTES = 20 * 1024 * 1024; // kept in the database, so a bigger file (an apk) goes in as a link instead
export const FAQ_FILES_PER_ITEM = 10;
const NAME_MAX = 120;
const LINK_MAX = 500;
const APK_MIME = "application/vnd.android.package-archive";
const INLINE_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"];
const MIME_BY_EXTENSION: Record<string, string> = {
  apk: APK_MIME, pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  mp4: "video/mp4", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip: "application/zip", txt: "text/plain",
};

export function cleanFileName(raw: unknown): string {
  const base = String(raw || "").split(/[\\/]/).pop() || "";
  return base.replace(/[\u0000-\u001f"<>|?*:]/g, "").trim().slice(0, NAME_MAX) || "file";
}

export function mimeFor(name: string, given: unknown): string {
  const extension = (name.split(".").pop() || "").toLowerCase();
  const fromName = MIME_BY_EXTENSION[extension];
  const sent = String(given || "").toLowerCase();
  if (fromName) return fromName; // an apk is often sent as application/octet-stream
  return /^[a-z]+\/[a-z0-9.+-]+$/.test(sent) ? sent : "application/octet-stream";
}

export const isImageMime = (mime: string) => /^image\/(png|jpeg|gif|webp)$/.test(mime);
export const isInlineMime = (mime: string) => INLINE_MIMES.includes(mime);

export function parseUpload(body: any): { name: string; mime: string; data: Buffer } | { error: string } {
  const name = cleanFileName(body?.name);
  const raw = String(body?.data || "");
  const match = /^data:([^;,]*)(?:;[^,]*)?;base64,([\s\S]*)$/.exec(raw);
  const base64 = match ? match[2] : raw;
  if (!base64) return { error: "empty" };
  const data = Buffer.from(base64, "base64");
  if (!data.length) return { error: "empty" };
  if (data.length > FAQ_FILE_MAX_BYTES) return { error: "tooBig" };
  return { name, mime: mimeFor(name, match?.[1] || body?.mime), data };
}

export function parseLink(body: any): { name: string; url: string } | { error: string } {
  const url = String(body?.url || "").trim().slice(0, LINK_MAX);
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return { error: "badLink" };
  return { name: cleanFileName(body?.name) === "file" ? new URL(url).hostname : cleanFileName(body?.name), url };
}

