// Driver-free receipt printing: the receipt (HTML) is drawn into a picture exactly as wide as the printer's print area, turned into black and white dots and sent
// straight to the printer's port 9100 as ESC/POS raster data. No Windows printer driver, no paper size, no browser print scaling: what is drawn is what is printed
// (Chinese names and logos too, because they are only pixels to the printer).
const { BrowserWindow } = require("electron");
const net = require("net");

const DOTS_PER_MM = 8; // a 203 dpi receipt head
const CSS_PX_PER_MM = 96 / 25.4;
const BAND_ROWS = 255; // rows sent per raster command: older printers read at most this many at once
const BLACK_BELOW = 165; // a pixel darker than this prints (the receipt is solid black text on white)
const SETTLE_MS = 350; // time for fonts and images to be drawn before the picture is taken
const SEND_TIMEOUT_MS = 8000;
const FEED_LINES = 5;

const mmToDots = (mm) => Math.max(8, Math.round(mm * DOTS_PER_MM / 8) * 8); // whole bytes per row

// A BGRA picture -> one bit per dot, rows padded to whole bytes (1 = black).
function toBits(bitmap, width, height) {
  const rowBytes = width / 8;
  const bits = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      const alpha = bitmap[at + 3];
      const light = alpha < 128 ? 255 : 0.114 * bitmap[at] + 0.587 * bitmap[at + 1] + 0.299 * bitmap[at + 2];
      if (light < BLACK_BELOW) bits[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return { bits, rowBytes };
}

// The printer's commands: reset, left margin + print width, the picture in bands, feed and a partial cut.
function buildEscPos({ bits, rowBytes, height }, leftDots, widthDots) {
  const parts = [Buffer.from([0x1b, 0x40])];
  parts.push(Buffer.from([0x1d, 0x4c, leftDots & 255, leftDots >> 8])); // GS L: left margin
  parts.push(Buffer.from([0x1d, 0x57, widthDots & 255, widthDots >> 8])); // GS W: print area width
  for (let y = 0; y < height; y += BAND_ROWS) {
    const rows = Math.min(BAND_ROWS, height - y);
    parts.push(Buffer.from([0x1d, 0x76, 0x30, 0x00, rowBytes & 255, rowBytes >> 8, rows & 255, rows >> 8])); // GS v 0: raster picture
    parts.push(bits.subarray(y * rowBytes, (y + rows) * rowBytes));
  }
  parts.push(Buffer.from([0x1b, 0x64, FEED_LINES])); // ESC d: feed
  parts.push(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // GS V: feed and partial cut
  return Buffer.concat(parts);
}

// Draws the receipt at the print width and returns the picture (BGRA bytes, its size).
async function renderReceipt(html, widthDots) {
  const widthMm = widthDots / DOTS_PER_MM;
  const zoom = DOTS_PER_MM / CSS_PX_PER_MM; // CSS pixels -> printer dots, so 12px text stays 3 mm tall on paper
  const override = `<style>html,body{background:#fff !important}body{width:${widthMm}mm !important;margin:0 !important;padding-left:1.5mm !important;padding-right:1.5mm !important}</style>`;
  const page = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, override + "</head>") : override + html;
  const win = new BrowserWindow({ show: false, width: widthDots, height: 600, useContentSize: true, webPreferences: { offscreen: true, sandbox: true } });
  try {
    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(page));
    win.webContents.setZoomFactor(zoom);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const cssHeight = await win.webContents.executeJavaScript("Math.ceil(document.documentElement.scrollHeight)");
    const height = Math.max(8, Math.ceil(cssHeight * zoom));
    win.setContentSize(widthDots, height);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    let image = await win.webContents.capturePage({ x: 0, y: 0, width: widthDots, height });
    const size = image.getSize();
    if (size.width !== widthDots) image = image.resize({ width: widthDots }); // a screen with display scaling
    const finalSize = image.getSize();
    return { bitmap: image.toBitmap(), width: finalSize.width, height: finalSize.height };
  } finally {
    win.destroy();
  }
}

function send(host, port, data) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: SEND_TIMEOUT_MS });
    socket.on("connect", () => socket.end(data, () => resolve({ ok: true })));
    socket.on("timeout", () => { socket.destroy(); resolve({ ok: false, error: "the printer did not answer" }); });
    socket.on("error", (error) => resolve({ ok: false, error: error.code || String(error) }));
  });
}

// widthMm = the part of the paper that prints; leftMm = the gap from the head's left edge (a narrow roll in a wide printer).
async function printDirect(html, { host, port = 9100, widthMm, leftMm = 0 }) {
  const widthDots = mmToDots(widthMm);
  const leftDots = Math.max(0, Math.round(leftMm * DOTS_PER_MM));
  const { bitmap, width, height } = await renderReceipt(html, widthDots);
  const { bits, rowBytes } = toBits(bitmap, width, height);
  return send(host, port, buildEscPos({ bits, rowBytes, height }, leftDots, widthDots));
}

module.exports = { printDirect, renderReceipt, toBits, buildEscPos, mmToDots, DOTS_PER_MM };
