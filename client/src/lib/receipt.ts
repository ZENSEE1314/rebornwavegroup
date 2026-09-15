// Builds and prints 80mm receipts / kitchen dockets via the browser's print
// dialog. Set your thermal printer as the default printer (or "Save as PDF").

interface Item { name: string; qty: number; price: string | number; lineTotal: string | number; }
interface Order {
  orderNo: string; tableNumber?: string; memberName?: string; salesStaffName?: string;
  orderMode?: string; paymentMethod?: string; subtotal?: string | number; discount?: string | number;
  tax?: string | number; total?: string | number; items?: Item[]; createdAt?: string; paidAt?: string;
}
interface ReceiptMeta { clubName?: string; logoUrl?: string; footer?: string; taxPercent?: number; }

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
    ${disc}${tax}
    <div class="row big"><span>TOTAL</span><span>${rp(o.total)}</span></div>
    ${o.paymentMethod ? `<div class="row"><span>Paid</span><span class="b">${esc(String(o.paymentMethod).toUpperCase())}</span></div>` : ""}
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

function printDoc(inner: string) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) { alert("Allow pop-ups to print receipts."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title><style>${CSS}</style></head><body>${inner}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},300);};<\/script></body></html>`);
  w.document.close();
}

// Prints a merchant copy + customer copy in one job.
export function printReceipt(order: Order, meta: ReceiptMeta) {
  printDoc(receiptHtml(order, meta, "MERCHANT COPY") + `<div style="page-break-after:always;height:8mm;"></div>` + receiptHtml(order, meta, "CUSTOMER COPY"));
}
export function printKitchen(order: Order) {
  printDoc(kitchenHtml(order));
}
