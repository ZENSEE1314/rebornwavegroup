// A company's industries (sections of the business) are set by the BridgeX admin; the app only offers these.
export const MAX_INDUSTRIES = 12;
const MAX_INDUSTRY_LENGTH = 30;

/** Reborn's own sections, used until the BridgeX admin saves a list for it. */
export const REBORN_INDUSTRIES = ["Lounge", "Beauty", "KTV Room", "KTV VIP", "Restaurant", "Game House"];

/** A tidy list: trimmed, no commas (they separate a product's industries), no repeats (any case), limited in number and length. */
export function cleanIndustries(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split("\n") : [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of list) {
    const name = String(item ?? "").replace(/[,\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_INDUSTRY_LENGTH);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    clean.push(name);
    if (clean.length >= MAX_INDUSTRIES) break;
  }
  return clean;
}
