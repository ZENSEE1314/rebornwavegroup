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

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface QrCardPart { svg: string; label: string }

// WIFI:T:WPA;S:name;P:password;;  — the characters \ ; , : " in the name or password are escaped with a backslash.
export function wifiQrText(name: string, password: string, security: WifiSecurity): string {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${security};S:${escape(name)};${security === "nopass" ? "" : `P:${escape(password)};`};`;
}

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

export function saveCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
  const link = document.createElement("a");
  link.download = `${fileName.replace(/[^\p{L}\p{N}_-]+/gu, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
