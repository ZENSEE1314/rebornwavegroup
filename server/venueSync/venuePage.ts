// Venue PC only: /venue shows the QR code of this PC's address, to print and put on the tables. Guests join the venue Wi-Fi and scan it.
import type { Express } from "express";
import QRCode from "qrcode";
import { VENUE_MODE } from "../venueMode";

const QR_WIDTH = 640;

export function registerVenuePage(app: Express) {
  if (!VENUE_MODE) return;
  app.get("/venue", async (req, res) => {
    const address = `http://${req.headers.host}/`;
    const qr = await QRCode.toDataURL(address, { width: QR_WIDTH, margin: 2 });
    res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Venue Wi-Fi</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;margin:24px;color:#111}img{width:min(80vw,420px)}h1{margin:8px 0}p{margin:4px 0;font-size:18px}.a{font:bold 22px monospace;margin-top:12px}</style></head>
<body><h1>1. Wi-Fi &rarr; 2. Scan &rarr; 3. Order &amp; request songs</h1>
<p>Sambungkan ke Wi-Fi, scan, lalu pesan &amp; request lagu</p><p>连接 Wi-Fi，扫码，点餐和点歌</p>
<img alt="QR" src="${qr}"><div class="a">${address}</div></body></html>`);
  });
}
