// WhatsApp Web (Linked Devices) connection via Baileys — scan a QR to link an
// existing WhatsApp number so the CRM bot can send/receive without the Meta Cloud API.
//
// ⚠️ This uses WhatsApp's unofficial multi-device web protocol. It is against
// WhatsApp's Terms of Service and the linked number CAN be banned. Use a dedicated
// business number, not a personal one.
//
// Auth state is persisted in the `wa_auth` table so the link survives restarts and
// redeploys (Railway's filesystem is ephemeral).
import makeWASocket, {
  initAuthCreds, BufferJSON, proto, DisconnectReason,
  fetchLatestBaileysVersion, makeCacheableSignalKeyStore, type AuthenticationState,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { handleInboundText } from "./whatsappBot";

const logger = pino({ level: "silent" }) as any;

type Status = "idle" | "connecting" | "qr" | "connected" | "loggedout";
let status: Status = "idle";
let qrDataUrl: string | null = null;
let sock: ReturnType<typeof makeWASocket> | null = null;
let starting = false;
let selfNumber: string | null = null;

export function getWaWebStatus() {
  return { status, qr: status === "qr" ? qrDataUrl : null, number: selfNumber };
}
export function isWebConnected() {
  return status === "connected" && !!sock;
}

// --- DB-backed auth state (adapted from Baileys' useMultiFileAuthState) ----
async function ensureAuthTable() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS wa_auth (id VARCHAR PRIMARY KEY, data TEXT, updated_at TIMESTAMP DEFAULT NOW())`);
}
async function readAuth(id: string): Promise<any | null> {
  const r: any = await db.execute(sql`SELECT data FROM wa_auth WHERE id = ${id}`);
  const row = (r.rows || r)[0];
  return row?.data ? JSON.parse(row.data, BufferJSON.reviver) : null;
}
async function writeAuth(id: string, value: any) {
  const data = JSON.stringify(value, BufferJSON.replacer);
  await db.execute(sql`INSERT INTO wa_auth (id, data, updated_at) VALUES (${id}, ${data}, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`);
}
async function removeAuth(id: string) {
  await db.execute(sql`DELETE FROM wa_auth WHERE id = ${id}`);
}
async function clearAllAuth() {
  await db.execute(sql`DELETE FROM wa_auth`);
}

async function useDbAuthState(): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  await ensureAuthTable();
  const creds = (await readAuth("creds")) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out: any = {};
          await Promise.all(ids.map(async (id) => {
            let val = await readAuth(`${type}-${id}`);
            if (type === "app-state-sync-key" && val) val = proto.Message.AppStateSyncKeyData.fromObject(val);
            out[id] = val || undefined;
          }));
          return out;
        },
        set: async (data: any) => {
          const tasks: Promise<any>[] = [];
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              const key = `${type}-${id}`;
              tasks.push(value ? writeAuth(key, value) : removeAuth(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeAuth("creds", creds),
  };
}

// --- Socket lifecycle ----------------------------------------------------
export async function startWhatsAppWeb(): Promise<void> {
  if (starting || isWebConnected()) return;
  starting = true;
  status = "connecting";
  try {
    const { state, saveCreds } = await useDbAuthState();
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: ["Reborn Wave", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        status = "qr";
        try { qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 }); } catch { qrDataUrl = null; }
      }
      if (connection === "open") {
        status = "connected"; qrDataUrl = null;
        selfNumber = sock?.user?.id?.split(":")[0]?.split("@")[0] || null;
        console.log(`[wa-web] connected as ${selfNumber}`);
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log(`[wa-web] closed (code ${code}) loggedOut=${loggedOut}`);
        sock = null;
        if (loggedOut) { status = "loggedout"; qrDataUrl = null; await clearAllAuth().catch(() => {}); }
        else { status = "connecting"; setTimeout(() => { starting = false; startWhatsAppWeb().catch(() => {}); }, 3000); return; }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) {
        if (m.key.fromMe || !m.message) continue;
        const jid = m.key.remoteJid || "";
        if (jid.endsWith("@g.us") || jid === "status@broadcast") continue; // skip groups/status
        const from = jid.split("@")[0];
        const text = m.message.conversation
          || m.message.extendedTextMessage?.text
          || m.message.imageMessage?.caption
          || m.message.videoMessage?.caption
          || "";
        const name = m.pushName || undefined;
        if (from && text) { try { await handleInboundText(from, text, name); } catch (e) { console.error("[wa-web] inbound", e); } }
      }
    });
  } catch (e) {
    console.error("[wa-web] start error", e);
    status = "idle";
  } finally {
    starting = false;
  }
}

export async function sendWhatsAppWeb(to: string, text: string): Promise<boolean> {
  if (!isWebConnected() || !sock) return false;
  const jid = `${String(to).replace(/\D/g, "")}@s.whatsapp.net`;
  try { await sock.sendMessage(jid, { text }); return true; }
  catch (e) { console.error("[wa-web] send error", e); return false; }
}

export async function logoutWhatsAppWeb(): Promise<void> {
  try { await sock?.logout(); } catch {}
  sock = null; status = "loggedout"; qrDataUrl = null; selfNumber = null;
  await clearAllAuth().catch(() => {});
}

// On boot, resume the link automatically if we were previously connected.
export async function resumeWhatsAppWebIfLinked(): Promise<void> {
  try {
    await ensureAuthTable();
    const creds = await readAuth("creds");
    if (creds?.me?.id) { console.log("[wa-web] resuming saved session"); startWhatsAppWeb().catch(() => {}); }
  } catch (e) { console.error("[wa-web] resume", e); }
}
