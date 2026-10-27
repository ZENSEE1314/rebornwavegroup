// The food and drinks menu image: which items are on it, how they group (food, desserts, drinks) and how the rows are split into pages.
// The drawing is in client/src/components/MenuImageMaker.tsx; this file holds the rules so they can be tested.
import { stationFor } from "./station";

export interface MenuProduct {
  id: number;
  name: string;
  category?: string | null;
  price: string | number;
  salePrice?: string | number;
  imageUrl?: string | null;
  station?: string | null;
  posVisible?: boolean | null;
  active?: boolean | null;
  isService?: boolean | null;
  packageKind?: string | null;
  bundleItemId?: number | null;
  soldOut?: boolean | null;
}

export interface MenuItem { id: number; name: string; price: number; category: string; imageUrl: string | null; section: MenuSectionKind }
export type MenuSectionKind = "food" | "dessert" | "drinks";
export interface MenuSection { kind: MenuSectionKind; category: string; items: MenuItem[] }
export type MenuBlock = { kind: "heading"; title: string } | { kind: "row"; items: MenuItem[] };

export interface MenuOptions { includeSoldOut?: boolean; includeSets?: boolean }

export const MENU_COLUMNS = 2;
const SECTION_ORDER: MenuSectionKind[] = ["food", "dessert", "drinks"];
const OTHER_CATEGORY = "Other";

const sectionOf = (product: MenuProduct): MenuSectionKind => {
  const station = stationFor(product.category, product.station);
  return station === "bar" ? "drinks" : station === "dessert" ? "dessert" : "food";
};

/** What goes on the menu: things a customer can order and pay for (priced, shown in the POS, not a service, not a member package); sets ("6 x Beer") and sold-out items only when asked. */
export function menuItemsOf(products: MenuProduct[], options: MenuOptions = {}): MenuItem[] {
  return products
    .filter((p) => p.posVisible !== false && p.active !== false && !p.isService && !p.packageKind)
    .filter((p) => options.includeSets || !p.bundleItemId)
    .filter((p) => options.includeSoldOut || !p.soldOut)
    .map((p) => ({ id: p.id, name: p.name.trim(), price: Number(p.salePrice ?? p.price) || 0, category: (p.category || "").trim() || OTHER_CATEGORY, imageUrl: p.imageUrl || null, section: sectionOf(p) }))
    .filter((item) => item.price > 0 && item.name !== "");
}

/** Food first, then desserts, then drinks; inside each, categories A to Z and items A to Z. */
export function sectionsOf(items: MenuItem[]): MenuSection[] {
  const byKey = new Map<string, MenuSection>();
  for (const item of items) {
    const key = `${item.section}|${item.category.toLowerCase()}`;
    const section = byKey.get(key) ?? { kind: item.section, category: item.category, items: [] };
    section.items.push(item);
    byKey.set(key, section);
  }
  return Array.from(byKey.values())
    .map((s) => ({ ...s, items: [...s.items].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => SECTION_ORDER.indexOf(a.kind) - SECTION_ORDER.indexOf(b.kind) || a.category.localeCompare(b.category));
}

export interface PageHeights { page: number; firstHeader: number; nextHeader: number; footer: number; heading: number; row: number }

/** Splits the sections into pages: a heading is never left alone at the bottom of a page, and a category that continues on the next page gets its heading again. */
export function planPages(sections: MenuSection[], heights: PageHeights): MenuBlock[][] {
  const pages: MenuBlock[][] = [[]];
  let used = heights.firstHeader;
  const room = () => heights.page - heights.footer - used;
  const newPage = () => { pages.push([]); used = heights.nextHeader; };
  for (const section of sections) {
    const rows: MenuItem[][] = [];
    for (let i = 0; i < section.items.length; i += MENU_COLUMNS) rows.push(section.items.slice(i, i + MENU_COLUMNS));
    if (room() < heights.heading + heights.row) newPage();
    pages[pages.length - 1].push({ kind: "heading", title: section.category });
    used += heights.heading;
    for (const row of rows) {
      if (room() < heights.row) {
        newPage();
        pages[pages.length - 1].push({ kind: "heading", title: section.category });
        used += heights.heading;
      }
      pages[pages.length - 1].push({ kind: "row", items: row });
      used += heights.row;
    }
  }
  return pages.filter((page) => page.length > 0);
}
