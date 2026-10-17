// Builds and prints 80mm receipts / kitchen dockets via the browser's print
// dialog. Set your thermal printer as the default printer (or "Save as PDF").
import { translate as tr, localeTag } from "@/lib/i18n";
import { money } from "@/lib/money";
import { qrSvgNow } from "@/lib/qr-download";

interface Item { name: string; qty: number; price: string | number; lineTotal: string | number; status?: string; }
// Lines that left the bill (rejected, lost) are not on the receipt: they are not in its total either.
const OFF_RECEIPT = ["rejected", "lost", "cancelled"];
interface Order {
  orderNo: string; tableNumber?: string; memberName?: string; salesStaffName?: string;
  orderMode?: string; paymentMethod?: string; subtotal?: string | number; discount?: string | number;
  paymentReference?: string;
  cashReceived?: string | number; changeGiven?: string | number; status?: string;
  serviceFee?: string | number; tax?: string | number; total?: string | number; items?: Item[]; createdAt?: string; paidAt?: string;
  packageCreditUsed?: string | number; discountReason?: string | null;
  receiptSeq?: number; receiptDay?: string; // the paid bill's number within its venue day (1, 2, 3 ...) and that day's date
  commissionLabel?: string | null; commissionPayee?: string | null; commissionAmount?: string | number | null; // commission paid out of this sale: the sales copy shows it, the customer's copy never does
}
interface ReceiptMeta { clubName?: string; logoUrl?: string; footer?: string; serviceFeePercent?: number; taxPercent?: number; qr?: { text: string; caption?: string } | null; }

const rp = (n: any) => money(n);
const mode = (m?: string) => (m === "take_away" ? tr("pos.rc.takeAway") : tr("pos.rc.dineIn"));
// Translated payment method, falling back to the raw value for unknown methods.
const payLabel = (p: string) => { const k = `pos.rc.${p}`; const v = tr(k); return v === k ? p : v; };
const RECEIPT_NUMBER_DIGITS = 3;
const receiptNumber = (o: Order) => (o.receiptSeq ? String(o.receiptSeq).padStart(RECEIPT_NUMBER_DIGITS, "0") : "");
// What "Save as PDF" proposes as the file name: Receipt_2026-10-17_001 (the venue day and the customer's number of that day).
const receiptFileName = (o: Order) => (o.receiptSeq && o.receiptDay ? `Receipt_${o.receiptDay}_${receiptNumber(o)}` : undefined);
const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

// The roll in this printer: its width and how far the print is moved to the right. A 58 mm roll in an 80 mm printer often sits against one side, so the left of every line would print in the air.
// A property of the printer on this PC, so it is saved in this browser, not on the server.
export interface ReceiptPaper { widthMm: number; shiftMm: number }
const PAPER_KEY = "rw.receipt.paper";
const DEFAULT_PAPER: ReceiptPaper = { widthMm: 80, shiftMm: 0 };
export function getReceiptPaper(): ReceiptPaper {
  try {
    const saved = JSON.parse(localStorage.getItem(PAPER_KEY) || "null");
    if (saved && Number(saved.widthMm) >= 40 && Number(saved.widthMm) <= 120) return { widthMm: Number(saved.widthMm), shiftMm: Math.max(0, Math.min(40, Number(saved.shiftMm) || 0)) };
  } catch { /* storage blocked or bad value: use the default */ }
  return DEFAULT_PAPER;
}
export function saveReceiptPaper(paper: ReceiptPaper) {
  try { localStorage.setItem(PAPER_KEY, JSON.stringify(paper)); } catch { /* storage blocked: the choice lasts until the page is closed */ }
}
const buildCss = () => {
  const { widthMm, shiftMm } = getReceiptPaper();
  return `
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Courier New',monospace; }
  /* A thermal printer turns grey into faint dots, so everything is solid black, bold and slightly thickened. */
  body { width:${widthMm}mm; margin-left:${shiftMm}mm; padding:6mm 4mm; color:#000; font-weight:700; -webkit-text-stroke:0.35px #000; }
  .c { text-align:center; } .b { font-weight:bold; }
  img.logo { max-width:40mm; max-height:22mm; object-fit:contain; margin:0 auto 4px; display:block; }
  .name { font-size:15px; font-weight:bold; }
  .row { display:flex; justify-content:space-between; font-size:12px; line-height:1.5; }
  .muted { font-size:11px; color:#000; }
  hr { border:none; border-top:2px dashed #000; margin:6px 0; }
  .big { font-size:15px; font-weight:bold; }
  .qr svg { width:42mm; height:42mm; display:block; margin:4px auto; }
  .mode { border:2px solid #000; display:inline-block; padding:2px 8px; font-weight:bold; margin:4px 0; font-size:13px; }
  h1.k { font-size:20px; text-align:center; margin:4px 0; }
  .kitem { font-size:16px; font-weight:bold; line-height:1.7; border-bottom:2px dotted #000; }
  @media print { @page { margin:0; } }
`;
};

function receiptHtml(o: Order, m: ReceiptMeta, copyLabel: string, withQr = false, showCommission = false, duplicate = false) {
  const when = new Date(o.paidAt || o.createdAt || Date.now()).toLocaleString(localeTag());
  const items = (o.items || []).filter((it) => !OFF_RECEIPT.includes(String(it.status))).map((it) => `<div class="row"><span>${it.qty}× ${esc(it.name)}</span><span>${rp(it.lineTotal)}</span></div>`).join("");
  const disc = Number(o.discount) > 0 ? `<div class="row"><span>${tr("pos.rc.discount")}${o.discountReason ? ` (${esc(o.discountReason)})` : ""}</span><span>- ${rp(o.discount)}</span></div>` : "";
  // Part of the bill paid with the member's package credit, and what was left to pay.
  const pkg = Number(o.packageCreditUsed) > 0 ? `<div class="row"><span>${tr("pos.rc.packageCredit")}</span><span>- ${rp(o.packageCreditUsed)}</span></div><div class="row b"><span>${tr("pos.rc.toPay")}</span><span>${rp(Number(o.total) - Number(o.packageCreditUsed))}</span></div>` : "";
  const service = Number(o.serviceFee) > 0 ? `<div class="row"><span>${m.serviceFeePercent ? tr("pos.rc.serviceFeePct", { n: m.serviceFeePercent }) : tr("pos.rc.serviceFee")}</span><span>${rp(o.serviceFee)}</span></div>` : "";
  const tax = Number(o.tax) > 0 ? `<div class="row"><span>${m.taxPercent ? tr("pos.rc.taxPct", { n: m.taxPercent }) : tr("pos.rc.tax")}</span><span>${rp(o.tax)}</span></div>` : "";
  const commission = showCommission && Number(o.commissionAmount) > 0
    ? `<div class="row"><span>${tr("pos.rc.commission")}${o.commissionLabel ? ` ${esc(o.commissionLabel)}` : ""}${o.commissionPayee ? ` · ${esc(o.commissionPayee)}` : ""}</span><span>${rp(o.commissionAmount)}</span></div><div class="c muted">${tr("pos.rc.commissionNote")}</div>`
    : "";
  return `
    <div class="c">
      ${m.logoUrl ? `<img class="logo" src="${m.logoUrl}" />` : ""}
      <div class="name">${esc(m.clubName || "Reborn Wave Group")}</div>
      <div class="mode">${mode(o.orderMode)}</div>
      ${duplicate ? `<div class="mode" style="letter-spacing:2px;">${esc(tr("pos.rc.duplicate"))}</div><div class="muted">${esc(tr("pos.rc.reprinted", { when: new Date().toLocaleString(localeTag()) }))}</div>` : ""}
    </div>
    <hr/>
    ${o.receiptSeq ? `<div class="row"><span>${tr("pos.rc.no")}</span><span class="b">${esc(receiptNumber(o))}</span></div>` : ""}
    <div class="row"><span>${tr("pos.rc.order")}</span><span class="b">${esc(o.orderNo)}</span></div>
    ${o.tableNumber ? `<div class="row"><span>${tr("pos.rc.table")}</span><span>${esc(o.tableNumber)}</span></div>` : ""}
    ${o.memberName ? `<div class="row"><span>${tr("pos.rc.member")}</span><span>${esc(o.memberName)}</span></div>` : ""}
    ${o.salesStaffName ? `<div class="row"><span>${tr("pos.rc.servedBy")}</span><span>${esc(o.salesStaffName)}</span></div>` : ""}
    <div class="row"><span>${tr("pos.rc.date")}</span><span>${esc(when)}</span></div>
    <hr/>
    ${items}
    <hr/>
    <div class="row"><span>${tr("pos.rc.subtotal")}</span><span>${rp(o.subtotal ?? o.total)}</span></div>
    ${disc}${service}${tax}
    <div class="row big"><span>${tr("pos.rc.total")}</span><span>${rp(o.total)}</span></div>
    ${pkg}
    ${o.paymentMethod ? `<div class="row"><span>${tr("pos.rc.paid")}</span><span class="b">${esc(payLabel(String(o.paymentMethod)).toUpperCase())}</span></div>` : ""}
    ${o.paymentReference ? `<div class="row"><span>${tr("pos.rc.cardRef")}</span><span class="b">${esc(o.paymentReference)}</span></div>` : ""}
    ${o.paymentMethod === "cash" ? `<div class="row"><span>${tr("pos.rc.cashReceived")}</span><span class="b">${rp(o.cashReceived)}</span></div><div class="row"><span>${tr("pos.rc.change")}</span><span class="b">${rp(o.changeGiven)}</span></div>` : ""}
    ${o.status === "refunded" ? `<div class="c b" style="font-size:18px;margin-top:6px;">${tr("pos.rc.refunded")}</div>` : ""}
    ${commission}
    <hr/>
    ${withQr && m.qr?.text ? `<div class="c qr">${qrSvgNow(m.qr.text)}${m.qr.caption ? `<div class="muted b">${esc(m.qr.caption)}</div>` : ""}</div>` : ""}
    <div class="c muted">${esc(m.footer || tr("pos.rc.thanks"))}</div>
    <div class="c muted b" style="margin-top:4px;">— ${copyLabel} —</div>
  `;
}

function kitchenHtml(o: Order, title?: string) {
  const when = new Date(o.createdAt || Date.now()).toLocaleTimeString(localeTag());
  const items = (o.items || []).map((it) => `<div class="kitem">${it.qty} × ${esc(it.name)}</div>`).join("");
  return `
    <h1 class="k">${esc(title || tr("pos.rc.kitchen"))}</h1>
    <div class="c mode">${mode(o.orderMode)}</div>
    <hr/>
    <div class="row b" style="font-size:15px;"><span>${esc(tr("pos.rc.tableN", { n: o.tableNumber || "-" }))}</span><span>${esc(o.orderNo)}</span></div>
    <div class="row muted"><span>${esc(o.memberName || "")}</span><span>${esc(when)}</span></div>
    <hr/>
    ${items}
  `;
}

function printDoc(inner: string, fileName?: string): boolean {
  const title = fileName || tr("pos.rc.docTitle");
  const fullHtml = `<!doctype html><html lang="${localeTag()}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${buildCss()}</style></head><body>${inner}</body></html>`;
  const nativeBridge = (window as any).ReactNativeWebView;
  if (nativeBridge?.postMessage) {
    nativeBridge.postMessage(JSON.stringify({ type: "PRINT_HTML", html: fullHtml, title }));
    return true;
  }
  if (/Android|iPhone|iPad|iPod|; wv\)/i.test(navigator.userAgent)) return false;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); return false; }
  doc.open();
  doc.write(fullHtml);
  doc.close();
  // Chrome names the PDF after the page being printed: use the receipt's name while the print window is open.
  const pageTitle = document.title;
  frame.onload = () => {
    if (fileName) document.title = fileName;
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => { document.title = pageTitle; frame.remove(); }, 3000);
  };
  return true;
}

// Prints a merchant copy + customer copy in one job.
// `duplicate` = a reprint from the sales history: every copy is marked DUPLICATE with the time it was printed again.
export function printReceipt(order: Order, meta: ReceiptMeta, opts: { duplicate?: boolean } = {}) {
  const dup = !!opts.duplicate;
  return printDoc(receiptHtml(order, meta, tr("pos.rc.merchantCopy"), false, true, dup) + `<div style="page-break-after:always;height:8mm;"></div>` + receiptHtml(order, meta, tr("pos.rc.customerCopy"), true, false, dup), dup && receiptFileName(order) ? `${receiptFileName(order)}_duplicate` : receiptFileName(order));
}
// The bill handed to the customer before they pay: what they ordered and the total due. Not a receipt (no payment, no commission, no QR).
export function printBill(order: Order, meta: ReceiptMeta) {
  return printDoc(`<div class="c b" style="font-size:14px;margin-bottom:4px;">${tr("pos.rc.billTitle")}</div>` + receiptHtml(order, meta, tr("pos.rc.billNote")), `Bill_${order.orderNo}`);
}
// A small slip with one or two QR codes (a table, the Wi-Fi) for the receipt printer.
export function printQrSlip(title: string, subtitle: string, parts: Array<{ svg: string; label: string }>) {
  const body = parts.map((part) => `<div class="c qr">${part.svg}<div class="b" style="font-size:13px;margin:2px 0 10px;">${esc(part.label)}</div></div>`).join("");
  return printDoc(`<div class="c"><div class="name">${esc(title)}</div>${subtitle ? `<div class="muted">${esc(subtitle)}</div>` : ""}</div><hr/>${body}`, `qr-${title}`);
}
// A short slip with a ruler, to set the roll width and shift on this PC.
export function printPaperTest() {
  return printDoc(`<div class="c"><div class="name">${esc(tr("pos.rc.paperTestTitle"))}</div></div><div class="row"><span>|&lt;&lt; ${esc(tr("pos.rc.paperLeft"))}</span><span>${esc(tr("pos.rc.paperRight"))} &gt;&gt;|</span></div><hr/>`);
}
export function printKitchen(order: Order, title?: string) {
  return printDoc(kitchenHtml(order, title));
}

export function printClosingReport(report: any, meta: ReceiptMeta = {}) {
  const items = (report.items || []).map((item: any) => `<div class="row"><span>${item.quantity}× ${esc(item.name)}</span><span>${rp(item.sales)}</span></div>`).join("");
  const t = report.totals || {};
  return printDoc(`<div class="c">${meta.logoUrl ? `<img class="logo" src="${meta.logoUrl}" />` : ""}<div class="name">${esc(meta.clubName || "Reborn Wave Group")}</div><div class="mode">${tr("pos.rc.endOfDay")}</div><div class="muted">${esc(report.day || "")}</div></div><hr/><div class="row"><span>${tr("pos.rc.paidOrders")}</span><span>${Number(report.ticketCount || 0)}</span></div><hr/>${items || `<div class="c muted">${tr("pos.rc.noItems")}</div>`}<hr/><div class="row"><span>${tr("pos.rc.grossSales")}</span><span>${rp(t.subtotal)}</span></div><div class="row"><span>${tr("pos.rc.discounts")}</span><span>- ${rp(t.discount)}</span></div><div class="row"><span>${tr("pos.rc.serviceFee")}</span><span>${rp(t.serviceFee)}</span></div><div class="row"><span>${tr("pos.rc.tax")}</span><span>${rp(t.tax)}</span></div><div class="row big"><span>${tr("pos.rc.totalRevenue")}</span><span>${rp(t.revenue)}</span></div><div class="row"><span>${tr("pos.rc.cash")}</span><span>${rp(t.cash)}</span></div><div class="row"><span>${tr("pos.rc.card")}</span><span>${rp(t.card)}</span></div>${Number(t.credits) ? `<div class="row"><span>${tr("pos.pay.credits")}</span><span>${rp(t.credits)}</span></div>` : ""}${Number(t.packageCredit) ? `<div class="row"><span>${tr("pos.rc.packageCredit")}</span><span>${rp(t.packageCredit)}</span></div>` : ""}<hr/><div class="row"><span>${tr("pos.rc.productCost")}</span><span>- ${rp(t.cost)}</span></div><div class="row big"><span>${tr("pos.rc.grossProfit")}</span><span>${rp(t.profit)}</span></div><hr/><div class="c muted">${esc(tr("pos.rc.closed", { when: new Date(report.closedAt || Date.now()).toLocaleString(localeTag()) }))}</div>`);
}
