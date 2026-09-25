// Builds and prints 80mm receipts / kitchen dockets via the browser's print
// dialog. Set your thermal printer as the default printer (or "Save as PDF").

interface Item { name: string; qty: number; price: string | number; lineTotal: string | number; }
interface Order {
  orderNo: string; tableNumber?: string; memberName?: string; salesStaffName?: string;
  orderMode?: string; paymentMethod?: string; subtotal?: string | number; discount?: string | number;
  paymentReference?: string;
  cashReceived?: string | number; changeGiven?: string | number; status?: string;
  serviceFee?: string | number; tax?: string | number; total?: string | number; items?: Item[]; createdAt?: string; paidAt?: string;
}
interface ReceiptMeta { clubName?: string; logoUrl?: string; footer?: string; serviceFeePercent?: number; taxPercent?: number; }

const rp = (n: any) => "RP " + Math.round(Number(n) || 0).toLocaleString("en-US");
const mode = (m?: string) => (m === "take_away" ? "TAKE AWAY" : "DINE IN");
const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Courier New',monospace; }
  body { width:80mm; padding:6mm 4mm; color:#000; }
  .c { text-align:center; } .b { font-weight:bold; }
  img.logo { max-width:40mm; max-height:22mm; object-fit:contain; margin:0 auto 4px; display:block; }
  .name { font-size:15px; font-weight:bold; }
  .row { display:flex; justify-content:space-between; font-size:12px; line-height:1.5; }
  .muted { font-size:11px; color:#000; }
  hr { border:none; border-top:1px dashed #000; margin:6px 0; }
  .big { font-size:15px; font-weight:bold; }
  .mode { border:2px solid #000; display:inline-block; padding:2px 8px; font-weight:bold; margin:4px 0; font-size:13px; }
  h1.k { font-size:20px; text-align:center; margin:4px 0; }
  .kitem { font-size:16px; font-weight:bold; line-height:1.7; border-bottom:1px dotted #999; }
  @media print { @page { margin:0; } }
`;

function receiptHtml(o: Order, m: ReceiptMeta, copyLabel: string) {
  const when = new Date(o.paidAt || o.createdAt || Date.now()).toLocaleString();
  const items = (o.items || []).map((it) => `<div class="row"><span>${it.qty}× ${esc(it.name)}</span><span>${rp(it.lineTotal)}</span></div>`).join("");
  const disc = Number(o.discount) > 0 ? `<div class="row"><span>Discount</span><span>- ${rp(o.discount)}</span></div>` : "";
  const service = Number(o.serviceFee) > 0 ? `<div class="row"><span>Service fee${m.serviceFeePercent ? ` (${m.serviceFeePercent}%)` : ""}</span><span>${rp(o.serviceFee)}</span></div>` : "";
  const tax = Number(o.tax) > 0 ? `<div class="row"><span>Tax${m.taxPercent ? ` (${m.taxPercent}%)` : ""}</span><span>${rp(o.tax)}</span></div>` : "";
  return `
    <div class="c">
      ${m.logoUrl ? `<img class="logo" src="${m.logoUrl}" />` : ""}
      <div class="name">${esc(m.clubName || "Reborn Wave Group")}</div>
      <div class="mode">${mode(o.orderMode)}</div>
    </div>
    <hr/>
    <div class="row"><span>Order</span><span class="b">${esc(o.orderNo)}</span></div>
    ${o.tableNumber ? `<div class="row"><span>Table</span><span>${esc(o.tableNumber)}</span></div>` : ""}
    ${o.memberName ? `<div class="row"><span>Member</span><span>${esc(o.memberName)}</span></div>` : ""}
    ${o.salesStaffName ? `<div class="row"><span>Served by</span><span>${esc(o.salesStaffName)}</span></div>` : ""}
    <div class="row"><span>Date</span><span>${esc(when)}</span></div>
    <hr/>
    ${items}
    <hr/>
    <div class="row"><span>Subtotal</span><span>${rp(o.subtotal ?? o.total)}</span></div>
    ${disc}${service}${tax}
    <div class="row big"><span>TOTAL</span><span>${rp(o.total)}</span></div>
    ${o.paymentMethod ? `<div class="row"><span>Paid</span><span class="b">${esc(String(o.paymentMethod).toUpperCase())}</span></div>` : ""}
    ${o.paymentReference ? `<div class="row"><span>Card / receipt ref.</span><span class="b">${esc(o.paymentReference)}</span></div>` : ""}
    ${o.paymentMethod === "cash" ? `<div class="row"><span>Cash received</span><span class="b">${rp(o.cashReceived)}</span></div><div class="row"><span>Change</span><span class="b">${rp(o.changeGiven)}</span></div>` : ""}
    ${o.status === "refunded" ? `<div class="c b" style="font-size:18px;margin-top:6px;">REFUNDED</div>` : ""}
    <hr/>
    <div class="c muted">${esc(m.footer || "Thank you!")}</div>
    <div class="c muted b" style="margin-top:4px;">— ${copyLabel} —</div>
  `;
}

function kitchenHtml(o: Order) {
  const when = new Date(o.createdAt || Date.now()).toLocaleTimeString();
  const items = (o.items || []).map((it) => `<div class="kitem">${it.qty} × ${esc(it.name)}</div>`).join("");
  return `
    <h1 class="k">KITCHEN</h1>
    <div class="c mode">${mode(o.orderMode)}</div>
    <hr/>
    <div class="row b" style="font-size:15px;"><span>Table ${esc(o.tableNumber || "-")}</span><span>${esc(o.orderNo)}</span></div>
    <div class="row muted"><span>${esc(o.memberName || "")}</span><span>${esc(when)}</span></div>
    <hr/>
    ${items}
  `;
}

function printDoc(inner: string): boolean {
  const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>${CSS}</style></head><body>${inner}</body></html>`;
  const nativeBridge = (window as any).ReactNativeWebView;
  if (nativeBridge?.postMessage) {
    nativeBridge.postMessage(JSON.stringify({ type: "PRINT_HTML", html: fullHtml }));
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
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 3000);
  };
  return true;
}

// Prints a merchant copy + customer copy in one job.
export function printReceipt(order: Order, meta: ReceiptMeta) {
  return printDoc(receiptHtml(order, meta, "MERCHANT COPY") + `<div style="page-break-after:always;height:8mm;"></div>` + receiptHtml(order, meta, "CUSTOMER COPY"));
}
export function printKitchen(order: Order) {
  return printDoc(kitchenHtml(order));
}

export function printClosingReport(report: any, meta: ReceiptMeta = {}) {
  const items = (report.items || []).map((item: any) => `<div class="row"><span>${item.quantity}× ${esc(item.name)}</span><span>${rp(item.sales)}</span></div>`).join("");
  const t = report.totals || {};
  return printDoc(`<div class="c">${meta.logoUrl ? `<img class="logo" src="${meta.logoUrl}" />` : ""}<div class="name">${esc(meta.clubName || "Reborn Wave Group")}</div><div class="mode">END OF DAY</div><div class="muted">${esc(report.day || "")}</div></div><hr/><div class="row"><span>Paid orders</span><span>${Number(report.ticketCount || 0)}</span></div><hr/>${items || '<div class="c muted">No items sold</div>'}<hr/><div class="row"><span>Gross sales</span><span>${rp(t.subtotal)}</span></div><div class="row"><span>Discounts</span><span>- ${rp(t.discount)}</span></div><div class="row"><span>Service fee</span><span>${rp(t.serviceFee)}</span></div><div class="row"><span>Tax</span><span>${rp(t.tax)}</span></div><div class="row big"><span>TOTAL REVENUE</span><span>${rp(t.revenue)}</span></div><div class="row"><span>Cash</span><span>${rp(t.cash)}</span></div><div class="row"><span>Card</span><span>${rp(t.card)}</span></div><hr/><div class="row"><span>Product cost</span><span>- ${rp(t.cost)}</span></div><div class="row big"><span>GROSS PROFIT</span><span>${rp(t.profit)}</span></div><hr/><div class="c muted">Closed ${esc(new Date(report.closedAt || Date.now()).toLocaleString())}</div>`);
}
