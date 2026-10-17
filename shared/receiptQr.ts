import { wifiQrText, type WifiSecurity } from "./wifi";

export type ReceiptQrKind = "none" | "wifi" | "review" | "link";
export const RECEIPT_QR_KINDS: ReceiptQrKind[] = ["none", "wifi", "review", "link"];

export interface ReceiptQrSettings { receiptQrKind?: string; receiptQrLink?: string; receiptQrCaption?: string; wifiName?: string; wifiPassword?: string; wifiSecurity?: string; googleReviewUrl?: string }

// What the QR at the bottom of the customer's receipt holds (empty = no QR): the venue Wi-Fi, the Google review link, or a link the admin typed.
export function receiptQrText(s: ReceiptQrSettings): string {
  switch (s.receiptQrKind) {
    case "wifi": return s.wifiName ? wifiQrText(s.wifiName, s.wifiPassword || "", (["WPA", "WEP", "nopass"].includes(String(s.wifiSecurity)) ? s.wifiSecurity : "WPA") as WifiSecurity) : "";
    case "review": return s.googleReviewUrl || "";
    case "link": return s.receiptQrLink || "";
    default: return "";
  }
}
