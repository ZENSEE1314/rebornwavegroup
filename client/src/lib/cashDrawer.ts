// Opens a cash drawer wired to an ESC/POS receipt printer.
// The standard "drawer kick" command is ESC p m t1 t2 (0x1B 0x70 0x00 0x19 0xFA).
// Two supported transports, tried in order:
//   1. Web Serial (Chrome/Edge on desktop) — pair the printer once via connectDrawerSerial().
//   2. A local network endpoint (e.g. the print server that ships with your POS) — set its URL.
// Both settings are stored per-device in localStorage.

const KICK = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const URL_KEY = "cashDrawerUrl";

export function getDrawerUrl(): string { try { return localStorage.getItem(URL_KEY) || ""; } catch { return ""; } }
export function setDrawerUrl(url: string) { try { url ? localStorage.setItem(URL_KEY, url) : localStorage.removeItem(URL_KEY); } catch {} }
export function serialSupported(): boolean { return typeof navigator !== "undefined" && !!(navigator as any).serial; }

// Ask the user to pick the printer's serial port (must be called from a click).
export async function connectDrawerSerial(): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.serial) return false;
  try { await nav.serial.requestPort(); return true; } catch { return false; }
}

async function kickViaSerial(): Promise<boolean> {
  const nav = navigator as any;
  if (!nav.serial) return false;
  try {
    const ports = await nav.serial.getPorts();
    const port = ports[0];
    if (!port) return false;
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(KICK);
    writer.releaseLock();
    await port.close();
    return true;
  } catch { return false; }
}

async function kickViaUrl(): Promise<boolean> {
  const url = getDrawerUrl();
  if (!url) return false;
  try {
    // Most local print servers accept a POST; body carries the raw kick bytes.
    await fetch(url, { method: "POST", mode: "no-cors", body: KICK });
    return true;
  } catch { return false; }
}

// Best-effort open. Returns true if a transport accepted the command.
export async function openCashDrawer(): Promise<boolean> {
  if (await kickViaSerial()) return true;
  if (await kickViaUrl()) return true;
  return false;
}

export function drawerConfigured(): boolean {
  return !!getDrawerUrl() || serialSupported();
}
