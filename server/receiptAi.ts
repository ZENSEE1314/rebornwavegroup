// Reads a supplier receipt / delivery note photo with Claude: the supplier, invoice number, date and every line
// (item, quantity, unit price), and which inventory item each line is. Needs ANTHROPIC_API_KEY on the server.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { cleanReceipt, type ReadReceipt } from "./receiptLogic";

const MODEL = "claude-opus-5-5";
const MAX_PRODUCT_NAMES = 400;
const TIMEOUT_MS = 90_000;

const ReceiptSchema = z.object({
  readable: z.boolean().describe("false when the photo is not a receipt / invoice / delivery note or can't be read"),
  kind: z.enum(["goods", "expense"]).describe("goods = items bought to stock (drinks, food, supplies); expense = a bill or receipt for rent, electricity, water, internet, repairs, a service or a salary, with no goods to stock"),
  category: z.enum(["rental", "utilities", "salary", "other"]).describe("for an expense: rental, utilities (electricity / water / internet / gas), salary, or other; use other for goods"),
  supplier: z.string().describe("the seller's business name, as printed"),
  supplierPhone: z.string().describe("the seller's phone number, or empty"),
  invoiceNo: z.string().describe("invoice / receipt / delivery note number, or empty"),
  date: z.string().describe("the receipt date as YYYY-MM-DD, or empty"),
  total: z.number().describe("the grand total to pay, 0 if not shown"),
  items: z.array(z.object({
    name: z.string().describe("the item as printed"),
    qty: z.number().describe("quantity bought, in the unit the line is priced in"),
    unit: z.string().describe("the unit printed for the line, e.g. Dus, Ctn-24, Botol, Pcs; empty if none"),
    packSize: z.number().describe("how many single items are in one of that unit when the receipt prints it (Ctn-24 → 24, 1 x 24 → 24); 0 if it is not printed"),
    unitCost: z.number().describe("price for one of that unit, after any line discount"),
    lineTotal: z.number().describe("line amount, 0 if not shown"),
    matchedProduct: z.string().describe("the exact name from the inventory list that is this same item, or empty if none is"),
  })),
});

export const receiptAiReady = () => Boolean(process.env.ANTHROPIC_API_KEY);

export class ReceiptReadError extends Error {
  constructor(public reason: "noKey" | "badImage" | "unreadable" | "failed") { super(reason); }
}

const SYSTEM = [
  "You read photos of supplier receipts, invoices and delivery notes for a venue's stock room.",
  "Copy what is printed; never invent a line, a price or a supplier. Numbers are plain numbers: no currency symbols,",
  "no thousands separators (\"Rp 35.000\" is 35000, \"S$4.50\" is 4.5). Skip tax, service, delivery, rounding and",
  "subtotal lines - only goods. If a line shows a pack (e.g. 1 CTN x 24), keep the quantity and price as the line",
  "prices it. For matchedProduct, pick a name from the inventory list only when it is clearly the same product",
  "(brand, size); otherwise leave it empty.",
].join(" ");

/** Reads a receipt photo (a data: URL from the admin's upload). Throws ReceiptReadError. */
export async function readReceiptPhoto(dataUrl: string, productNames: string[]): Promise<ReadReceipt> {
  if (!receiptAiReady()) throw new ReceiptReadError("noKey");
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new ReceiptReadError("badImage");
  const mediaType = m[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const names = productNames.slice(0, MAX_PRODUCT_NAMES).join("\n");

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { format: betaZodOutputFormat(ReceiptSchema) },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: m[2] } },
          { type: "text", text: `Inventory list (one per line):\n${names || "(empty)"}\n\nRead this receipt.` },
        ],
      }],
    });
    if (response.stop_reason === "refusal") throw new ReceiptReadError("unreadable");
    const out = response.parsed_output;
    if (!out || !out.readable) throw new ReceiptReadError("unreadable");
    return cleanReceipt(out);
  } catch (error) {
    if (error instanceof ReceiptReadError) throw error;
    console.error("[receipt] read failed", error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error);
    throw new ReceiptReadError("failed");
  }
}
