// Server-side language helpers. The app sends its language in the X-Lang
// header; WhatsApp uses the contact/member's saved language. Every message a
// member can see must be given in all three languages: English, 中文, Bahasa.
import type { Request } from "express";

import { currentTenant, homeCompanySlug } from "./tenantContext";

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
  return inBrandVoice(s);
}

const REBORN_NAMES = /Reborn Wave Group|Reborn Wave House|Reborn Wave|Reborn/g;
export const DEFAULT_PET_NAME = "Doluruu";
const petNames = new Map<string, string>();

// The pet name a company's admin chose, kept per company so texts can be built without a database read.
export function rememberPetName(name: string) {
  petNames.set(homeCompanySlug(), name || DEFAULT_PET_NAME);
}

// Built-in texts name Reborn and its pet Doluruu; another company's members read their
// own company name, and any company its own pet name.
export function inBrandVoice(text: string): string {
  const company = currentTenant()?.name;
  const named = company ? text.replace(REBORN_NAMES, company) : text;
  const pet = petNames.get(homeCompanySlug());
  return pet && pet !== DEFAULT_PET_NAME ? named.split(DEFAULT_PET_NAME).join(pet) : named;
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

// FAQ items in a language: the admin's own translation (faq_items.i18n) wins,
// the built-in help answers are translated here, otherwise the original text.
const DEFAULT_FAQ_T: Record<string, { zh: { question: string; answer: string }; id: { question: string; answer: string } }> = {
  "How do I activate my pet?": {
    zh: { question: "如何激活我的宠物？", answer: "在店内购买盲盒套餐，然后打开宠物护理，输入套餐上印的激活码。你的 Doluruu 就会活过来，陪伴你 15 天。" },
    id: { question: "Bagaimana cara mengaktifkan peliharaan saya?", answer: "Beli paket blindbox di klub, lalu buka Perawatan Peliharaan dan masukkan kode aktivasi yang tercetak di paket. Doluruu Anda akan hidup selama 15 hari." },
  },
  "How do I earn tokens?": {
    zh: { question: "如何赚取代币？", answer: "每天喂宠物 2 次。每完整喂养一天（2 次）可获得 1 个代币。代币可用于转盘游戏赢取奖品。" },
    id: { question: "Bagaimana cara mendapatkan token?", answer: "Beri makan peliharaan 2 kali sehari. Setiap hari penuh (2 kali makan) memberi Anda 1 token. Token bisa dipakai di permainan Putar Roda untuk hadiah." },
  },
  "Why did my pet get sick?": {
    zh: { question: "为什么我的宠物生病了？", answer: "宠物的寿命为 15 天。之后它会生病并停止赚取代币。来店消费 300,000 RP 即可从员工处免费获得一颗复活药丸——让宠物再延长 15 天。" },
    id: { question: "Kenapa peliharaan saya sakit?", answer: "Peliharaan hidup selama 15 hari. Setelah itu ia sakit dan berhenti menghasilkan token. Datang dan belanja 300.000 RP untuk mendapat pil kebangkitan gratis dari staf — memperpanjang peliharaan 15 hari lagi." },
  },
  "What is the Doluruu egg?": {
    zh: { question: "Doluruu 蛋是什么？", answer: "如果你在转盘上赢得 Doluruu 蛋，它会在 15 天后孵化成一只全新的宠物，之后你可以再喂养它 15 天来赚取代币。" },
    id: { question: "Apa itu telur Doluruu?", answer: "Jika Anda memenangkan telur Doluruu di roda, telur itu menetas menjadi peliharaan baru setelah 15 hari, lalu bisa Anda beri makan 15 hari lagi untuk token." },
  },
  "How do I claim a prize I won?": {
    zh: { question: "如何领取我赢得的奖品？", answer: "你在转盘上赢得的奖品会显示在“我的奖品”中。在店内出示给员工——管理员确认后即可领取奖品。" },
    id: { question: "Bagaimana cara mengklaim hadiah yang saya menangkan?", answer: "Hadiah dari roda muncul di 'Hadiah Saya'. Tunjukkan ke staf kami di klub — admin akan mengonfirmasi dan menyerahkan hadiah Anda." },
  },
};
export function faqIn<T extends { question: string; answer: string; i18n?: any }>(f: T, lang: Lang): T {
  if (lang === "en") return f;
  const own = f.i18n?.[lang] || {};
  const def = DEFAULT_FAQ_T[f.question]?.[lang];
  return { ...f, question: own.question || def?.question || f.question, answer: own.answer || def?.answer || f.answer };
}
