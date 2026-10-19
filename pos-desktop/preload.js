// What the web POS may ask of the Windows app: print a receipt without a dialog, open the cash drawer, read and change the app's settings.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rebornDesktop", {
  isDesktop: true,
  printHtml: (html) => ipcRenderer.invoke("reborn:print", html),
  openDrawer: () => ipcRenderer.invoke("reborn:drawer"),
  getConfig: () => ipcRenderer.invoke("reborn:config:get"),
  setConfig: (next) => ipcRenderer.invoke("reborn:config:set", next),
  printers: () => ipcRenderer.invoke("reborn:printers"),
  testDrawer: () => ipcRenderer.invoke("reborn:testDrawer"),
  testPrint: () => ipcRenderer.invoke("reborn:testPrint"),
});
