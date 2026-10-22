// Reads a receipt photo for the admin forms. With the AI key on the server the server reads it; without one the browser reads the letters itself
// (tesseract.js, loaded only when used, English + Indonesian) and the server turns the text into supplier / date / items and matches the items.
import { apiRequest } from "@/lib/queryClient";

const READ_URL = "/api/reborn/admin/inventory/receipt/read";
const READ_TEXT_URL = "/api/reborn/admin/inventory/receipt/read-text";
const OCR_LANGUAGES = ["eng", "ind"];
const PERCENT = 100;
const OCR_TARGET_WIDTH = 2400; // small photos are enlarged: the letters of a phone photo are too small for the reader otherwise
const OCR_MAX_WIDTH = 3000;
const CONTRAST = 1.35;
const MID_GREY = 128;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

/** The photo as a larger, grey, higher-contrast picture: coloured paper and blue print read far better that way. */
async function prepareForOcr(src: string): Promise<HTMLCanvasElement | string> {
  try {
    const img = await loadImage(src);
    const scale = Math.min(OCR_MAX_WIDTH, Math.max(img.width, OCR_TARGET_WIDTH)) / img.width;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = pixels.data;
    for (let i = 0; i < d.length; i += 4) {
      const grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const value = Math.max(0, Math.min(255, (grey - MID_GREY) * CONTRAST + MID_GREY + (grey > MID_GREY ? 20 : 0)));
      d[i] = d[i + 1] = d[i + 2] = value;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  } catch {
    return src;
  }
}

export async function ocrReceiptText(image: string, onProgress?: (percent: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(OCR_LANGUAGES, 1, {
    logger: (message: { status: string; progress: number }) => { if (message.status === "recognizing text") onProgress?.(Math.round(message.progress * PERCENT)); },
  });
  try {
    const { data } = await worker.recognize(await prepareForOcr(image));
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/** The receipt as the server's reader answers it (supplier, phone, address, invoice, date, time, total, items matched to the inventory). */
export async function readReceipt(image: string, useAi: boolean, onProgress?: (percent: number) => void): Promise<any> {
  if (useAi) return (await apiRequest("POST", READ_URL, { image })).json();
  const text = await ocrReceiptText(image, onProgress);
  return (await apiRequest("POST", READ_TEXT_URL, { text })).json();
}
