// Reborn POS for Windows (7 and newer): opens the POS full screen, prints receipts silently on the chosen printer and opens the cash drawer
// straight over the network. Everything else is the normal web POS (rebornwave.group/pos): the same login, the same screens.
const { app, BrowserWindow, Menu, ipcMain, screen, shell } = require("electron");
const fs = require("fs");
const net = require("net");
const path = require("path");
const { printDirect } = require("./escpos");

const DEFAULT_URL = "https://rebornwave.group/pos";
const PRINTER_PORT = 9100; // raw printing port of a network receipt printer
// ESC p m t1 t2 = "open the cash drawer": a pulse of t1 x 2 ms on the drawer socket's pin m (0 = pin 2, 1 = pin 5). Drawers are wired to one or the other and many need a
// pulse longer than the 50 ms default, so both pins get a 100 ms pulse.
const DRAWER_PULSE = 0x32;
const DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, DRAWER_PULSE, 0xfa, 0x1b, 0x70, 0x01, DRAWER_PULSE, 0xfa]);
const DRAWER_TIMEOUT_MS = 3000;
const PRINT_WINDOW_MS = 20000;

const configFile = () => path.join(app.getPath("userData"), "config.json");
const DEFAULTS = { url: DEFAULT_URL, printerName: "", drawerIp: "", fullScreen: true, directPrint: false, printWidthMm: 48, printLeftMm: 0 };
const readConfig = () => { try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(configFile(), "utf8")) }; } catch { return { ...DEFAULTS }; } };
const writeConfig = (next) => { fs.mkdirSync(path.dirname(configFile()), { recursive: true }); fs.writeFileSync(configFile(), JSON.stringify({ ...readConfig(), ...next }, null, 2)); };

let main = null;
let settings = null;

function openMain() {
  const config = readConfig();
  main = new BrowserWindow({
    width: 1280, height: 800, fullscreen: !!config.fullScreen, autoHideMenuBar: true, backgroundColor: "#0a0714", title: "Reborn POS",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, spellcheck: false },
  });
  main.loadURL(config.url || DEFAULT_URL);
  // Links to other sites (a map, WhatsApp) open in the normal browser, not inside the cash register.
  main.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(config.url || DEFAULT_URL)) { shell.openExternal(url); return { action: "deny" }; }
    // The customer screen goes full screen on the second monitor (the one facing the customer); with one monitor it is a normal window.
    if (new URL(url).pathname === "/customer") {
      const others = screen.getAllDisplays().filter((display) => display.id !== screen.getDisplayMatching(main.getBounds()).id);
      const target = others[0];
      return { action: "allow", overrideBrowserWindowOptions: target
        ? { x: target.bounds.x, y: target.bounds.y, width: target.bounds.width, height: target.bounds.height, fullscreen: true, autoHideMenuBar: true, backgroundColor: "#05030c" }
        : { width: 1024, height: 768, autoHideMenuBar: true, backgroundColor: "#05030c" } };
    }
    return { action: "allow" };
  });
  main.webContents.on("did-fail-load", (_event, _code, _text, _url, isMainFrame) => { if (isMainFrame) setTimeout(() => main && main.loadURL(readConfig().url || DEFAULT_URL), 5000); });
  main.on("closed", () => { main = null; });
}

function openSettings() {
  if (settings) { settings.focus(); return; }
  settings = new BrowserWindow({ width: 520, height: 560, parent: main || undefined, modal: !!main, autoHideMenuBar: true, title: "Reborn POS settings", webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false } });
  settings.loadFile(path.join(__dirname, "settings.html"));
  settings.on("closed", () => { settings = null; });
}

// A receipt: loaded into a hidden window and printed with no dialog on the chosen printer (the default one when none is chosen).
function printHtml(html) {
  const config = readConfig();
  // Direct printing: the receipt is drawn as a picture and sent to the printer's own port, so no Windows driver, paper size or print scaling can cut it.
  if (config.directPrint && config.drawerIp) return printDirect(html, { host: config.drawerIp, widthMm: Number(config.printWidthMm) || 48, leftMm: Number(config.printLeftMm) || 0 }).catch((error) => ({ ok: false, error: String(error.message || error) }));
  return new Promise((resolve) => {
    const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false, sandbox: true } });
    const timer = setTimeout(() => { win.destroy(); resolve({ ok: false, error: "timeout" }); }, PRINT_WINDOW_MS);
    win.webContents.on("did-finish-load", () => {
      win.webContents.print({ silent: true, printBackground: true, deviceName: config.printerName || "", margins: { marginType: "none" } }, (ok, reason) => {
        clearTimeout(timer); win.destroy(); resolve({ ok, error: ok ? "" : reason });
      });
    });
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
}

function openDrawer() {
  const { drawerIp } = readConfig();
  return new Promise((resolve) => {
    if (!drawerIp) { resolve({ ok: false, error: "no printer address set" }); return; }
    const socket = net.connect({ host: drawerIp, port: PRINTER_PORT, timeout: DRAWER_TIMEOUT_MS });
    socket.on("connect", () => socket.end(DRAWER_KICK, () => resolve({ ok: true })));
    socket.on("timeout", () => { socket.destroy(); resolve({ ok: false, error: "the printer did not answer" }); });
    socket.on("error", (error) => resolve({ ok: false, error: error.code || String(error) }));
  });
}

ipcMain.handle("reborn:print", (_event, html) => printHtml(String(html || "")));
ipcMain.handle("reborn:drawer", () => openDrawer());
ipcMain.handle("reborn:config:get", () => readConfig());
ipcMain.handle("reborn:config:set", (_event, next) => {
  const clean = {};
  if (typeof next.url === "string" && /^https?:\/\//.test(next.url.trim())) clean.url = next.url.trim();
  if (typeof next.printerName === "string") clean.printerName = next.printerName;
  if (typeof next.drawerIp === "string") clean.drawerIp = next.drawerIp.trim();
  if (typeof next.fullScreen === "boolean") clean.fullScreen = next.fullScreen;
  if (typeof next.directPrint === "boolean") clean.directPrint = next.directPrint;
  if (Number(next.printWidthMm) >= 20 && Number(next.printWidthMm) <= 80) clean.printWidthMm = Number(next.printWidthMm);
  if (Number(next.printLeftMm) >= 0 && Number(next.printLeftMm) <= 40) clean.printLeftMm = Number(next.printLeftMm);
  writeConfig(clean);
  if (main) { main.setFullScreen(readConfig().fullScreen); main.loadURL(readConfig().url); }
  return readConfig();
});
ipcMain.handle("reborn:printers", async () => (main ? (await main.webContents.getPrintersAsync()).map((p) => ({ name: p.name, isDefault: !!p.isDefault })) : []));
ipcMain.handle("reborn:testDrawer", () => openDrawer());
// A test slip with a frame, a ruler and the widest lines a receipt has, to see at once whether anything is cut.
ipcMain.handle("reborn:testPrint", () => {
  const ruler = Array.from({ length: 9 }, (_, i) => `<span style="position:absolute;left:${i * 10}mm;top:0;border-left:2px solid #000;height:${i % 2 ? 4 : 7}mm"></span>${i % 2 === 0 ? `<span style="position:absolute;left:${i * 10}mm;top:8mm;font-size:11px">${i * 10}</span>` : ""}`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Courier New',monospace;font-weight:700} body{padding:4mm 1.5mm} .row{display:flex;justify-content:space-between;font-size:12px;line-height:1.5} .box{border:2px solid #000;padding:2mm;margin:2mm 0}</style></head><body><div class="box"><div class="row"><span>LEFT EDGE</span><span>RIGHT EDGE</span></div><div class="row"><span>1x Heineken Beer PINT</span><span>RP 300,000</span></div><div class="row"><span>TOTAL</span><span>RP 2,016,000</span></div></div><div style="position:relative;height:13mm;margin-top:2mm">${ruler}</div><div class="row"><span>If the box is whole,</span></div><div class="row"><span>nothing is cut.</span></div></body></html>`;
  return printHtml(html);
});

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on("second-instance", () => { if (main) { if (main.isMinimized()) main.restore(); main.focus(); } });
  app.whenReady().then(() => {
    app.setLoginItemSettings({ openAtLogin: true }); // starts with Windows
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: "Reborn POS", submenu: [
        { label: "Settings", accelerator: "CommandOrControl+Shift+S", click: openSettings },
        { label: "Reload", accelerator: "F5", click: () => main && main.reload() },
        { label: "Full screen", accelerator: "F11", click: () => main && main.setFullScreen(!main.isFullScreen()) },
        { type: "separator" },
        { label: "Quit", accelerator: "CommandOrControl+Q", click: () => app.quit() },
      ] },
    ]));
    openMain();
    if (!readConfig().printerName) setTimeout(openSettings, 1500); // first start: choose the printer
  });
  app.on("window-all-closed", () => app.quit());
}
