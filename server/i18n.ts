// Server-side language helpers. The app sends its language in the X-Lang
// header; WhatsApp uses the contact/member's saved language. Every message a
// member can see must be given in all three languages: English, 中文, Bahasa.
import type { Request } from "express";

export type Lang = "en" | "zh" | "id";
export const LANGS: Lang[] = ["en", "zh", "id"];

export function asLang(v: unknown): Lang {
  return v === "zh" || v === "id" ? v : "en";
}

// Language of an app request (X-Lang header → ?lang= → English).
export function reqLang(req: Request): Lang {
  return asLang(String(req.headers["x-lang"] || (req.query as any)?.lang || "").toLowerCase());
}

// Pick the right text and fill `{name}` placeholders.
export type Tri = { en: string; zh: string; id: string };
export function pick(lang: Lang, t: Tri, vars?: Record<string, string | number>): string {
  let s = t[lang] || t.en;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}
export function tr(req: Request, t: Tri, vars?: Record<string, string | number>): string {
  return pick(reqLang(req), t, vars);
}

// Locale tag for dates in a language.
export function localeOf(lang: Lang): string {
  return lang === "zh" ? "zh-CN" : lang === "id" ? "id-ID" : "en-GB";
}

// A member's saved language (profile / WhatsApp choice). Used for WhatsApp,
// push notifications and anything else sent outside an app request.
export async function userLang(userId?: string | null): Promise<Lang> {
  if (!userId) return "en";
  try {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const [u] = await db.select({ l: users.preferredLanguage }).from(users).where(eq(users.id, userId));
    return asLang(u?.l);
  } catch { return "en"; }
}
