// QR codes as pictures: a Wi-Fi code (what a phone camera reads as "join this network") and cards that can be saved as a PNG image.
import QRCode from "qrcode";

const CARD_WIDTH_ONE = 1000;
const CARD_WIDTH_TWO = 1900;
const CARD_HEIGHT = 1300;
const QR_SIZE = 800;
const MARGIN = 100;
const TITLE_FONT = "bold 80px sans-serif";
const LABEL_FONT = "bold 44px sans-serif";
const SMALL_FONT = "36px sans-serif";

export type { WifiSecurity } from "@shared/wifi";
export { wifiQrText } from "@shared/wifi";

export interface QrCardPart { svg: string; label: string }

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  const sized = /<svg[^>]*\swidth=/.test(svg) ? svg : svg.replace("<svg ", `<svg width="${QR_SIZE}" height="${QR_SIZE}" `);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR picture could not be drawn"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  });
}

// One white card: each QR with its label under it, a big title and a small line at the bottom. One part = a single QR card, two = side by side.
export async function drawQrCard(title: string, subtitle: string, parts: QrCardPart[]): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = parts.length > 1 ? CARD_WIDTH_TWO : CARD_WIDTH_ONE;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot draw here");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000000";
  context.textAlign = "center";
  context.font = TITLE_FONT;
  context.fillText(title, canvas.width / 2, MARGIN);
  const slot = canvas.width / parts.length;
  for (let i = 0; i < parts.length; i++) {
    const image = await loadSvg(parts[i].svg);
    const centre = slot * i + slot / 2;
    context.drawImage(image, centre - QR_SIZE / 2, MARGIN + 60, QR_SIZE, QR_SIZE);
    context.font = LABEL_FONT;
    context.fillText(parts[i].label, centre, MARGIN + 60 + QR_SIZE + 70);
  }
  if (subtitle) { context.font = SMALL_FONT; context.fillText(subtitle, canvas.width / 2, CARD_HEIGHT - 50); }
  return canvas;
}

export type SaveResult = "downloaded" | "shared" | "printed";

const safeName = (fileName: string) => fileName.replace(/[^\p{L}\p{N}_-]+/gu, "-");
const isPhoneBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const toBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Picture could not be made"))), "image/png"));

// Saves the card as a PNG in whatever way this screen allows:
//  - inside the phone app (a web view cannot download files) it goes to the app's print window, where "Save as PDF" keeps it;
//  - in a phone browser it opens the share sheet with the picture (Save to gallery / Files);
//  - on a computer it is a normal download.
export async function saveCardImage(canvas: HTMLCanvasElement, fileName: string): Promise<SaveResult> {
  const name = `${safeName(fileName)}.png`;
  const nativeBridge = (window as any).ReactNativeWebView;
  if (nativeBridge?.postMessage) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>@page{margin:8mm}body{margin:0}img{width:100%}</style></head><body><img src="${canvas.toDataURL("image/png")}"/></body></html>`;
    nativeBridge.postMessage(JSON.stringify({ type: "PRINT_HTML", html, title: name }));
    return "printed";
  }
  const blob = await toBlob(canvas);
  const file = new File([blob], name, { type: "image/png" });
  if (isPhoneBrowser() && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return "shared"; } catch (error) { if ((error as { name?: string }).name === "AbortError") return "shared"; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}

const QUIET_ZONE = 4;
// The same QR as an SVG string, made at once (a receipt is printed without waiting): one square per dark module, white around.
export function qrSvgNow(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  let path = "";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (qr.modules.data[y * size + x]) path += `M${x + QUIET_ZONE},${y + QUIET_ZONE}h1v1h-1z`;
  const full = size + QUIET_ZONE * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
