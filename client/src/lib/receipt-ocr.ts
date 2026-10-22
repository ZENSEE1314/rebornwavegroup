// Reads a receipt photo for the admin forms. With the AI key on the server the server reads it; without one the browser reads the letters itself
// (tesseract.js, loaded only when used, English + Indonesian) and the server turns the text into supplier / date / items and matches the items.
import { apiRequest } from "@/lib/queryClient";

const READ_URL = "/api/reborn/admin/inventory/receipt/read";
const READ_TEXT_URL = "/api/reborn/admin/inventory/receipt/read-text";
const OCR_LANGUAGES = ["eng", "ind"];
const PERCENT = 100;

export async function ocrReceiptText(image: string, onProgress?: (percent: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(OCR_LANGUAGES, 1, {
    logger: (message: { status: string; progress: number }) => { if (message.status === "recognizing text") onProgress?.(Math.round(message.progress * PERCENT)); },
  });
  try {
    const { data } = await worker.recognize(image);
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
