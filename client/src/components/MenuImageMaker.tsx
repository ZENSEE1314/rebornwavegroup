import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { money } from "@/lib/money";
import { menuItemsOf, planPages, sectionsOf, type MenuBlock, type MenuItem, type MenuProduct, type PageHeights } from "@shared/menuLayout";

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const MARGIN = 70;
const COLUMN_GAP = 40;
const HEIGHTS: PageHeights = { page: PAGE_HEIGHT, firstHeader: 260, nextHeader: 110, footer: 80, heading: 90, row: 300 };
const CARD_HEIGHT = 270;
const PHOTO_SIZE = 230;
const INK = "#1b1530";
const ACCENT = "#e0398a";
const PAPER = "#fffaf3";
const CARD = "#ffffff";
const FONT = "'Segoe UI', Arial, sans-serif";

interface MenuInfo { clubName: string; businessAddress: string }

const loadPhoto = (item: MenuItem): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  if (!item.imageUrl) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = item.imageUrl;
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

const drawCard = (ctx: CanvasRenderingContext2D, item: MenuItem, photo: HTMLImageElement | null, x: number, y: number, width: number) => {
  ctx.fillStyle = CARD;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, width, CARD_HEIGHT, 24) : ctx.rect(x, y, width, CARD_HEIGHT); ctx.fill();
  const photoX = x + 20, photoY = y + (CARD_HEIGHT - PHOTO_SIZE) / 2;
  ctx.save();
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE, 18) : ctx.rect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE); ctx.clip();
  if (photo) {
    const scale = Math.max(PHOTO_SIZE / photo.width, PHOTO_SIZE / photo.height);
    const w = photo.width * scale, h = photo.height * scale;
    ctx.drawImage(photo, photoX + (PHOTO_SIZE - w) / 2, photoY + (PHOTO_SIZE - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#f1e7f5"; ctx.fillRect(photoX, photoY, PHOTO_SIZE, PHOTO_SIZE);
    ctx.fillStyle = ACCENT; ctx.font = `700 90px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(item.name.charAt(0).toUpperCase(), photoX + PHOTO_SIZE / 2, photoY + PHOTO_SIZE / 2);
  }
  ctx.restore();
  const textX = photoX + PHOTO_SIZE + 24, textWidth = x + width - textX - 20;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = INK; ctx.font = `700 34px ${FONT}`;
  fitText(ctx, item.name, textWidth, 3).forEach((line, i) => ctx.fillText(line, textX, y + 70 + i * 42));
  ctx.fillStyle = ACCENT; ctx.font = `800 38px ${FONT}`;
  ctx.fillText(money(item.price), textX, y + CARD_HEIGHT - 32);
};

const drawPage = (info: MenuInfo, blocks: MenuBlock[], photos: Map<number, HTMLImageElement | null>, pageNo: number, pageCount: number, dateText: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH; canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  let y = MARGIN;
  ctx.textBaseline = "alphabetic";
  if (pageNo === 0) {
    ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.font = `800 76px ${FONT}`;
    ctx.fillText(info.clubName, PAGE_WIDTH / 2, y + 70);
    ctx.fillStyle = ACCENT; ctx.font = `700 34px ${FONT}`; ctx.fillText("FOOD & DRINKS MENU", PAGE_WIDTH / 2, y + 130);
    if (info.businessAddress) { ctx.fillStyle = "#6b6480"; ctx.font = `400 26px ${FONT}`; ctx.fillText(info.businessAddress, PAGE_WIDTH / 2, y + 172); }
    y = HEIGHTS.firstHeader;
  } else {
    ctx.fillStyle = "#6b6480"; ctx.textAlign = "left"; ctx.font = `600 26px ${FONT}`; ctx.fillText(info.clubName, MARGIN, y + 20);
    y = HEIGHTS.nextHeader;
  }
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - COLUMN_GAP) / 2;
  for (const block of blocks) {
    if (block.kind === "heading") {
      ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.font = `800 44px ${FONT}`; ctx.fillText(block.title.toUpperCase(), MARGIN, y + 50);
      ctx.fillStyle = ACCENT; ctx.fillRect(MARGIN, y + 64, 90, 6);
      y += HEIGHTS.heading;
    } else {
      block.items.forEach((item, col) => drawCard(ctx, item, photos.get(item.id) ?? null, MARGIN + col * (cardWidth + COLUMN_GAP), y, cardWidth));
      y += HEIGHTS.row;
    }
  }
  ctx.fillStyle = "#9a93ad"; ctx.textAlign = "center"; ctx.font = `400 22px ${FONT}`;
  ctx.fillText(`${dateText}  ·  ${pageNo + 1} / ${pageCount}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 40);
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

// A food and drinks menu picture built from the current POS items and their photos; opens fresh each time so new items and prices are always on it.
export function MenuImageMaker() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [includeSoldOut, setIncludeSoldOut] = useState(false);
  const [includeSets, setIncludeSets] = useState(false);
  const [canvases, setCanvases] = useState<HTMLCanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { data: products = [] } = useQuery<MenuProduct[]>({ queryKey: ["/api/reborn/pos/products", "menu"], queryFn: () => apiRequest("GET", "/api/reborn/pos/products").then((r) => r.json()), enabled: isOpen });
  const { data: info } = useQuery<MenuInfo>({ queryKey: ["/api/reborn/pos/menu-info"], queryFn: () => apiRequest("GET", "/api/reborn/pos/menu-info").then((r) => r.json()), enabled: isOpen });
  const items = useMemo(() => menuItemsOf(products, { includeSoldOut, includeSets }), [products, includeSoldOut, includeSets]);

  useEffect(() => {
    if (!isOpen || !info) return;
    let isCurrent = true;
    setIsDrawing(true);
    (async () => {
      const pages = planPages(sectionsOf(items), HEIGHTS);
      const photos = new Map<number, HTMLImageElement | null>();
      await Promise.all(items.map(async (item) => { photos.set(item.id, await loadPhoto(item)); }));
      if (!isCurrent) return;
      const dateText = new Date().toLocaleDateString();
      setCanvases(pages.map((blocks, i) => drawPage(info, blocks, photos, i, pages.length, dateText)));
      setIsDrawing(false);
    })();
    return () => { isCurrent = false; };
  }, [isOpen, info, items]);

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
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={includeSets} onChange={(e) => setIncludeSets(e.target.checked)} />{t("menuImage.sets")}</label>
      </div>
      <p className="mt-2 text-xs text-white/50">{isDrawing ? t("menuImage.drawing") : t("menuImage.ready", { items: items.length, pages: canvases.length })}</p>
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
