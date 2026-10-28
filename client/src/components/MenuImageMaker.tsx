import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { money } from "@/lib/money";
import { bundlesOf, menuItemsOf, planPages, sectionsOf, type BundleGroup, type MenuBlock, type MenuItem, type MenuProduct, type PageHeights } from "@shared/menuLayout";

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 70;
const COLUMN_GAP = 40;
const HEIGHTS: PageHeights = { page: PAGE_HEIGHT, firstHeader: 330, nextHeader: 130, footer: 130, heading: 100, row: 300, bundle: 400 };
const CARD_HEIGHT = 270;
const PHOTO_SIZE = 230;
const BUNDLE_HEIGHT = 370;
const BUNDLE_PHOTO = 230;
const MAX_BUNDLE_OPTIONS = 4;
const FONT = "'Segoe UI', Arial, sans-serif";
const NEON_PINK = "#ff3dac";
const NEON_CYAN = "#38e8ff";
const NEON_PURPLE = "#8b5cf6";
const GOLD_LIGHT = "#fff1a8";
const GOLD = "#f5b81c";
const GOLD_DARK = "#b97700";
const RED_PRICE = ["#ff4a3a", "#c4101a"];
// Bundle banners take turns in a red, green and purple theme, like the club's poster.
const BUNDLE_THEMES = [
  { border: "#ff2a2a", panel: "#2a0507", price: RED_PRICE },
  { border: "#19d65c", panel: "#04230f", price: ["#2bd96a", "#0c8a3c"] },
  { border: NEON_PURPLE, panel: "#14082e", price: ["#a77bff", "#5a2fd0"] },
];
const BACKDROP_LIGHTS: [number, number, number, string][] = [[100, 120, 560, "rgba(139,92,246,0.45)"], [1160, 380, 520, "rgba(56,232,255,0.28)"], [220, 1000, 600, "rgba(255,61,172,0.25)"], [1100, 1500, 620, "rgba(139,92,246,0.4)"], [620, 1740, 520, "rgba(255,61,172,0.3)"]];
const SPARKLE_COUNT = 70;

interface MenuInfo { clubName: string; businessAddress: string; logoUrl?: string; categoryOrder?: string[] }
const LOGO_MAX_WIDTH = 520;
const LOGO_MAX_HEIGHT = 130;

const loadPhoto = (imageUrl: string | null): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  if (!imageUrl) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = imageUrl;
});

const fitText = (ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S*$/, "")}…`;
    return kept;
  }
  return lines;
};

const roundedPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
};
const glow = (ctx: CanvasRenderingContext2D, color: string, blur: number) => { ctx.shadowColor = color; ctx.shadowBlur = blur; };
const noGlow = (ctx: CanvasRenderingContext2D) => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; };

const goldFill = (ctx: CanvasRenderingContext2D, y: number, height: number): CanvasGradient => {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  gradient.addColorStop(0, GOLD_LIGHT); gradient.addColorStop(0.5, GOLD); gradient.addColorStop(1, GOLD_DARK);
  return gradient;
};

const drawPhoto = (ctx: CanvasRenderingContext2D, photo: HTMLImageElement, x: number, y: number, size: number) => {
  const scale = Math.max(size / photo.width, size / photo.height);
  const w = photo.width * scale, h = photo.height * scale;
  ctx.drawImage(photo, x + (size - w) / 2, y + (size - h) / 2, w, h);
};

const drawBackdrop = (ctx: CanvasRenderingContext2D) => {
  const base = ctx.createLinearGradient(0, 0, 0, PAGE_HEIGHT);
  base.addColorStop(0, "#0a0418"); base.addColorStop(0.5, "#14082b"); base.addColorStop(1, "#06020f");
  ctx.fillStyle = base; ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  for (const [x, y, radius, color] of BACKDROP_LIGHTS) {
    const spot = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spot.addColorStop(0, color); spot.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spot; ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  }
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < SPARKLE_COUNT; i++) ctx.fillRect((i * 197) % PAGE_WIDTH, (i * 389) % PAGE_HEIGHT, 1 + (i % 3), 1 + (i % 3));
};

const drawPricePill = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, colors: string[], align: "left" | "center" = "left") => {
  ctx.save();
  ctx.font = `900 italic ${fontSize}px ${FONT}`;
  const padding = fontSize * 0.45;
  const width = ctx.measureText(text).width + padding * 2, height = fontSize * 1.45;
  const left = align === "center" ? x - width / 2 : x;
  const gradient = ctx.createLinearGradient(0, y - height, 0, y);
  gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]);
  glow(ctx, colors[0], 18);
  ctx.fillStyle = gradient; roundedPath(ctx, left, y - height + 8, width, height, 14); ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(text, left + padding, y - fontSize * 0.2);
  ctx.restore();
};

const drawCard = (ctx: CanvasRenderingContext2D, item: MenuItem, photo: HTMLImageElement | null, x: number, y: number, width: number) => {
  ctx.save();
  glow(ctx, NEON_PINK, 22);
  ctx.fillStyle = "rgba(20,8,40,0.92)"; roundedPath(ctx, x, y, width, CARD_HEIGHT, 26); ctx.fill();
  noGlow(ctx);
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,61,172,0.85)"; roundedPath(ctx, x, y, width, CARD_HEIGHT, 26); ctx.stroke();
  ctx.restore();
  const photoX = x + 20, photoY = y + (CARD_HEIGHT - PHOTO_SIZE) / 2;
  ctx.save();
  roundedPath(ctx, photoX, photoY, PHOTO_SIZE, PHOTO_SIZE, 18); ctx.clip();
  if (photo) drawPhoto(ctx, photo, photoX, photoY, PHOTO_SIZE);
  else {
    const fill = ctx.createLinearGradient(photoX, photoY, photoX + PHOTO_SIZE, photoY + PHOTO_SIZE);
    fill.addColorStop(0, "#2b1257"); fill.addColorStop(1, "#5a1a66");
    ctx.fillStyle = fill; ctx.fillRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    ctx.fillStyle = GOLD_LIGHT; ctx.font = `800 100px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(item.name.charAt(0).toUpperCase(), photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2);
  }
  ctx.restore();
  const textX = photoX + PHOTO_SIZE + 24, textWidth = x + width - textX - 20;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#ffffff"; ctx.font = `800 34px ${FONT}`;
  fitText(ctx, item.name, textWidth, 3).forEach((line, i) => ctx.fillText(line, textX, y + 68 + i * 42));
  drawPricePill(ctx, money(item.price), textX, y + CARD_HEIGHT - 22, 34, RED_PRICE);
};

const drawBundle = (ctx: CanvasRenderingContext2D, group: BundleGroup, photo: HTMLImageElement | null, y: number, index: number) => {
  const theme = BUNDLE_THEMES[index % BUNDLE_THEMES.length];
  const x = MARGIN, width = PAGE_WIDTH - MARGIN * 2;
  ctx.save();
  glow(ctx, theme.border, 30);
  ctx.fillStyle = theme.panel; roundedPath(ctx, x, y, width, BUNDLE_HEIGHT, 34); ctx.fill();
  noGlow(ctx);
  ctx.lineWidth = 4; ctx.strokeStyle = theme.border; roundedPath(ctx, x, y, width, BUNDLE_HEIGHT, 34); ctx.stroke();
  ctx.restore();
  const photoX = x + 36, photoY = y + 26, textX = photoX + BUNDLE_PHOTO + 40;
  ctx.save();
  roundedPath(ctx, photoX, photoY, BUNDLE_PHOTO, BUNDLE_PHOTO, 24); ctx.clip();
  if (photo) drawPhoto(ctx, photo, photoX, photoY, BUNDLE_PHOTO);
  else { ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(photoX, photoY, BUNDLE_PHOTO, BUNDLE_PHOTO); }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  glow(ctx, theme.border, 16);
  ctx.fillStyle = "#ffffff"; ctx.font = `900 italic 66px ${FONT}`;
  const nameLines = fitText(ctx, group.name, width - BUNDLE_PHOTO - 120, 2);
  nameLines.forEach((line, i) => ctx.fillText(line, textX, photoY + 80 + i * 76));
  noGlow(ctx);
  ctx.fillStyle = goldFill(ctx, photoY + 120, 60); ctx.font = `800 36px ${FONT}`;
  ctx.fillText("BUNDLE DEALS", textX, photoY + 80 + nameLines.length * 76 + 4);
  ctx.restore();
  const options = group.options.slice(0, MAX_BUNDLE_OPTIONS), cell = (width - 72) / Math.max(1, options.length), stripY = y + 288;
  options.forEach((option, i) => {
    const centerX = x + 36 + cell * i + cell / 2;
    if (i > 0) { ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x + 36 + cell * i, stripY - 30, 2, 84); }
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = `800 30px ${FONT}`;
    ctx.fillText(`${option.qty} PCS`, centerX, stripY);
    drawPricePill(ctx, money(option.price), centerX, stripY + 56, 30, theme.price, "center");
  });
};

const drawLogo = (ctx: CanvasRenderingContext2D, logo: HTMLImageElement, centerX: number, top: number, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const w = logo.width * scale, h = logo.height * scale;
  glow(ctx, NEON_PURPLE, 26);
  ctx.drawImage(logo, centerX - w / 2, top + (maxHeight - h) / 2, w, h);
  noGlow(ctx);
};

const drawHeader = (ctx: CanvasRenderingContext2D, info: MenuInfo, logo: HTMLImageElement | null, isFirstPage: boolean) => {
  ctx.textBaseline = "alphabetic";
  if (!isFirstPage) {
    if (logo) { drawLogo(ctx, logo, MARGIN + 90, 30, 180, 80); return; }
    ctx.fillStyle = GOLD; ctx.textAlign = "left"; ctx.font = `800 30px ${FONT}`; ctx.fillText(info.clubName.toUpperCase(), MARGIN, 90);
    return;
  }
  const title = ctx.createLinearGradient(0, 80, PAGE_WIDTH, 180);
  title.addColorStop(0, "#d8c2ff"); title.addColorStop(0.5, "#ffffff"); title.addColorStop(1, NEON_CYAN);
  ctx.textAlign = "center"; ctx.fillStyle = title; ctx.font = `900 84px ${FONT}`;
  if (logo) drawLogo(ctx, logo, PAGE_WIDTH / 2, 30, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT + 20);
  else { glow(ctx, NEON_PURPLE, 26); ctx.fillText(info.clubName.toUpperCase(), PAGE_WIDTH / 2, 150); noGlow(ctx); }
  ctx.fillStyle = goldFill(ctx, 160, 110); ctx.font = `900 italic 120px ${FONT}`;
  glow(ctx, "rgba(255,170,0,0.6)", 22); ctx.fillText("MENU", PAGE_WIDTH / 2, 275); noGlow(ctx);
  ctx.fillStyle = GOLD; ctx.font = `600 28px ${FONT}`;
  ctx.fillText("FOOD  •  DRINKS  •  GOOD VIBES", PAGE_WIDTH / 2, 320);
};

const drawHeading = (ctx: CanvasRenderingContext2D, title: string, y: number) => {
  ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = `900 46px ${FONT}`;
  glow(ctx, NEON_PINK, 20); ctx.fillText(title.toUpperCase(), MARGIN, y + 52); noGlow(ctx);
  const bar = ctx.createLinearGradient(MARGIN, 0, MARGIN + 220, 0);
  bar.addColorStop(0, NEON_PINK); bar.addColorStop(1, NEON_CYAN);
  ctx.fillStyle = bar; ctx.fillRect(MARGIN, y + 68, 220, 6);
};

const drawPage = (info: MenuInfo, logo: HTMLImageElement | null, blocks: MenuBlock[], photos: Map<number, HTMLImageElement | null>, pageNo: number, pageCount: number, dateText: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH; canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  drawBackdrop(ctx);
  drawHeader(ctx, info, logo, pageNo === 0);
  let y = pageNo === 0 ? HEIGHTS.firstHeader : HEIGHTS.nextHeader;
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - COLUMN_GAP) / 2;
  let bundleIndex = 0;
  for (const block of blocks) {
    if (block.kind === "heading") {
      drawHeading(ctx, block.title, y);
      y += HEIGHTS.heading;
    } else if (block.kind === "row") {
      block.items.forEach((item, col) => drawCard(ctx, item, photos.get(item.id) ?? null, MARGIN + col * (cardWidth + COLUMN_GAP), y, cardWidth));
      y += HEIGHTS.row;
    } else {
      drawBundle(ctx, block.group, photos.get(block.group.itemId) ?? null, y, bundleIndex++);
      y += HEIGHTS.bundle ?? BUNDLE_HEIGHT;
    }
  }
  ctx.textAlign = "center";
  ctx.fillStyle = goldFill(ctx, PAGE_HEIGHT - 110, 40); ctx.font = `italic 700 38px ${FONT}`;
  ctx.fillText("Raise a glass to good times!", PAGE_WIDTH / 2, PAGE_HEIGHT - 70);
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = `400 22px ${FONT}`;
  ctx.fillText(`${dateText}  ·  ${pageNo + 1} / ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 30);
  return canvas;
};

const saveCanvas = (canvas: HTMLCanvasElement, fileName: string) => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
};

// A food and drinks menu picture built from the current POS items, bundle deals and photos; opens fresh each time so new items and prices are always on it.
export function MenuImageMaker() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [includeSoldOut, setIncludeSoldOut] = useState(false);
  const [includeBundles, setIncludeBundles] = useState(true);
  const [canvases, setCanvases] = useState<HTMLCanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { data: products = [] } = useQuery<MenuProduct[]>({ queryKey: ["/api/reborn/pos/products", "menu"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()), enabled: isOpen });
  const { data: info } = useQuery<MenuInfo>({ queryKey: ["/api/reborn/pos/menu-info"], queryFn: () => apiRequest("GET", "/api/reborn/pos/menu-info").then((r) => r.json()), enabled: isOpen });
  const items = useMemo(() => menuItemsOf(products, { includeSoldOut }), [products, includeSoldOut]);
  const bundles = useMemo(() => (includeBundles ? bundlesOf(products, { includeSoldOut }) : []), [products, includeSoldOut, includeBundles]);
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);
  const categoryOrder = useMemo(() => savedOrder ?? info?.categoryOrder ?? [], [savedOrder, info]);
  const categoryNames = useMemo(() => Array.from(new Set(sectionsOf(items, categoryOrder).map((section) => section.category))), [items, categoryOrder]);
  const { toast } = useToast();
  const saveOrder = useMutation({
    mutationFn: (order: string[]) => apiRequest("PUT", "/api/reborn/admin/menu-category-order", { order }).then((r) => r.json()),
    onSuccess: (data: { order: string[] }) => setSavedOrder(data.order),
    onError: (e: any) => toast({ title: t("menuImage.orderFail"), description: e.message, variant: "destructive" }),
  });
  const moveCategory = (index: number, step: -1 | 1) => {
    const next = [...categoryNames];
    const target = index + step;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder.mutate(next);
  };

  useEffect(() => {
    if (!isOpen || !info) return;
    let isCurrent = true;
    setIsDrawing(true);
    (async () => {
      const pages = planPages(sectionsOf(items, categoryOrder), HEIGHTS, bundles);
      const logo = await loadPhoto(info.logoUrl || null);
      const photos = new Map<number, HTMLImageElement | null>();
      const withPhotos = [...items.map((item) => ({ id: item.id, imageUrl: item.imageUrl })), ...bundles.map((group) => ({ id: group.itemId, imageUrl: group.imageUrl }))];
      await Promise.all(withPhotos.map(async ({ id, imageUrl }) => { photos.set(id, await loadPhoto(imageUrl)); }));
      if (!isCurrent) return;
      const dateText = new Date().toLocaleDateString();
      setCanvases(pages.map((blocks, i) => drawPage(info, logo, blocks, photos, i, pages.length, dateText)));
      setIsDrawing(false);
    })();
    return () => { isCurrent = false; };
  }, [isOpen, info, items, bundles, categoryOrder]);

  const stamp = new Date().toISOString().slice(0, 10);
  const downloadAll = () => canvases.forEach((canvas, i) => setTimeout(() => saveCanvas(canvas, `menu-${stamp}-${i + 1}.png`), i * 400));

  if (!isOpen) {
    return (
      <div className="mb-4 max-w-2xl rounded-2xl border border-pink-400/25 bg-pink-500/5 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="mb-3 sm:mb-0"><p className="text-sm font-bold text-pink-100">{t("menuImage.title")}</p><p className="text-xs text-white/45">{t("menuImage.desc")}</p></div>
        <button onClick={() => setIsOpen(true)} className="w-full rounded-xl border border-pink-400/40 bg-pink-500/15 px-4 py-2.5 text-sm font-bold text-pink-100 sm:w-auto">{t("menuImage.open")}</button>
      </div>
    );
  }
  return (
    <div className="mb-4 max-w-2xl rounded-2xl border border-pink-400/25 bg-pink-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-pink-100">{t("menuImage.title")}</p>
        <button onClick={() => setIsOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">{t("menuImage.close")}</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/70">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={includeSoldOut} onChange={(e) => setIncludeSoldOut(e.target.checked)} />{t("menuImage.soldOut")}</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={includeBundles} onChange={(e) => setIncludeBundles(e.target.checked)} />{t("menuImage.bundles")}</label>
      </div>
      {categoryNames.length > 1 && (
        <div className="mt-3 rounded-xl bg-black/25 p-2">
          <p className="mb-1.5 text-xs font-bold text-pink-100">{t("menuImage.orderTitle")}</p>
          <ol className="space-y-1">
            {categoryNames.map((name, i) => (
              <li key={name} className="flex items-center gap-2 text-xs text-white/80">
                <span className="w-5 text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <button type="button" onClick={() => moveCategory(i, -1)} disabled={i === 0 || saveOrder.isPending} aria-label={t("menuImage.moveUp")} className="w-9 h-9 rounded-lg bg-white/10 p-0 text-sm disabled:opacity-30">↑</button>
                <button type="button" onClick={() => moveCategory(i, 1)} disabled={i === categoryNames.length - 1 || saveOrder.isPending} aria-label={t("menuImage.moveDown")} className="w-9 h-9 rounded-lg bg-white/10 p-0 text-sm disabled:opacity-30">↓</button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-2 text-xs text-white/50">{isDrawing ? t("menuImage.drawing") : t("menuImage.ready", { items: items.length + bundles.length, pages: canvases.length })}</p>
      <button onClick={downloadAll} disabled={isDrawing || canvases.length === 0} className="mt-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-40">{t("menuImage.downloadAll")}</button>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {canvases.map((canvas, i) => (
          <div key={i} className="rounded-xl bg-black/30 p-2">
            <img src={canvas.toDataURL("image/png")} alt={`${t("menuImage.page")} ${i + 1}`} className="w-full rounded-lg" />
            <button onClick={() => saveCanvas(canvas, `menu-${stamp}-${i + 1}.png`)} className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-xs font-bold">{t("menuImage.downloadPage", { n: i + 1 })}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
