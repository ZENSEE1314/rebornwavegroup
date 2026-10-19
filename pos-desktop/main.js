// Reborn POS for Windows (7 and newer): opens the POS full screen, prints receipts silently on the chosen printer and opens the cash drawer
// straight over the network. Everything else is the normal web POS (rebornwave.group/pos): the same login, the same screens.
const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const fs = require("fs");
const net = require("net");
const path = require("path");

const DEFAULT_URL = "https://rebornwave.group/pos";
const PRINTER_PORT = 9100; // raw printing port of a network receipt printer
const DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]); // ESC p 0 25 250: the standard "open the cash drawer" pulse
const DRAWER_TIMEOUT_MS = 3000;
const PRINT_WINDOW_MS = 20000;

const configFile = () => path.join(app.getPath("userData"), "config.json");
const DEFAULTS = { url: DEFAULT_URL, printerName: "", drawerIp: "", fullScreen: true };
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
  main.webContents.setWindowOpenHandler(({ url }) => { if (!url.startsWith(config.url || DEFAULT_URL)) { shell.openExternal(url); return { action: "deny" }; } return { action: "allow" }; });
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
  return new Promise((resolve) => {
    const config = readConfig();
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
  writeConfig(clean);
  if (main) { main.setFullScreen(readConfig().fullScreen); main.loadURL(readConfig().url); }
  return readConfig();
});
ipcMain.handle("reborn:printers", async () => (main ? (await main.webContents.getPrintersAsync()).map((p) => ({ name: p.name, isDefault: !!p.isDefault })) : []));
ipcMain.handle("reborn:testDrawer", () => openDrawer());

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
