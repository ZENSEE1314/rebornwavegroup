// Error watcher: records every failed song request, booking, POS, shop order,
// KOS check-in and WhatsApp call into app_errors so admins see them in
// Admin › Errors, and alerts the main admins when something is really breaking
// (any 5xx, or a burst of the same kind of error).
import type { Express, Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { getUserId } from "./multiAuth";

export type ErrorArea = "song" | "booking" | "pos" | "order" | "checkin" | "whatsapp" | "server";
export const ERROR_AREAS: ErrorArea[] = ["song", "booking", "pos", "order", "checkin", "whatsapp", "server"];

// Which API calls are watched, by area.
export function areaForPath(path: string): ErrorArea | null {
  if (/^\/api\/reborn\/(songs?|song-|admin\/songs?|admin\/song-|admin\/karaoke)|^\/api\/karaoke\//.test(path)) return "song";
  if (/^\/api\/reborn\/(booking|my-bookings|admin\/bookings)/.test(path)) return "booking";
  if (/^\/api\/reborn\/(pos|admin\/pos)\b/.test(path)) return "pos";
  if (/^\/api\/reborn\/(shop|admin\/accounting\/orders)/.test(path)) return "order";
  if (/^\/api\/reborn\/venue\/checkin/.test(path)) return "checkin";
  if (/^\/api\/reborn\/(whatsapp|admin\/whatsapp|admin\/crm)/.test(path)) return "whatsapp";
  return null;
}

const clip = (v: unknown, n: number) => {
  const s = typeof v === "string" ? v : v instanceof Error ? (v.stack || v.message) : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();
  return String(s ?? "").slice(0, n);
};
// Never store passwords / tokens / card data in the log.
function safeBody(body: any): string {
  if (!body || typeof body !== "object") return "";
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (/pass|token|secret|otp|pin|card|cvv/i.test(k)) { out[k] = "***"; continue; }
    out[k] = typeof v === "string" ? v.slice(0, 120) : Array.isArray(v) ? `[${v.length} items]` : v && typeof v === "object" ? "{…}" : v;
  }
  return clip(out, 800);
}

export interface ErrorRecord {
  area: ErrorArea; source?: string; method?: string; path?: string; status?: number;
  message: string; userId?: string | null; detail?: string;
  expected?: boolean; // a normal "do this first" reply (e.g. scan your table) — logged, never alerted
}

const recent: Array<{ area: string; status: number; at: number }> = [];
const lastAlert = new Map<string, number>();

export async function recordError(e: ErrorRecord): Promise<void> {
  try {
    await db.execute(sql`INSERT INTO app_errors (area, source, method, path, status, message, user_id, detail)
      VALUES (${e.area}, ${e.source || "app"}, ${e.method || null}, ${clip(e.path || "", 300)}, ${e.status ?? 0}, ${clip(e.message, 1000)}, ${e.userId || null}, ${clip(e.detail || "", 4000)})`);
  } catch (err) { console.warn("[errors] record", (err as any)?.message); return; }
  if (e.expected) return;
  const now = Date.now();
  const status = e.status ?? 0;
  recent.push({ area: e.area, status, at: now });
  while (recent.length && now - recent[0].at > 10 * 60_000) recent.shift();
  // Alert on any server error (5xx / crash / WhatsApp failure), or on 5+ errors
  // of one area in 10 minutes. At most one alert per kind every 15 minutes.
  const burst = recent.filter((r) => r.area === e.area).length;
  const serious = status === 0 || status >= 500;
  if (!serious && burst < 5) return;
  const key = `${e.area}:${serious ? e.path || e.message.slice(0, 40) : "burst"}`;
  if (now - (lastAlert.get(key) || 0) < 15 * 60_000) return;
  lastAlert.set(key, now);
  void alertStaff(e, burst).catch((err) => console.warn("[errors] alert", err?.message));
}

const AREA_NAME: Record<ErrorArea, { en: string; zh: string; id: string }> = {
  song: { en: "Song request", zh: "点歌", id: "Permintaan lagu" },
  booking: { en: "Booking", zh: "预订", id: "Reservasi" },
  pos: { en: "POS", zh: "收银", id: "POS" },
  order: { en: "Order", zh: "订单", id: "Pesanan" },
  checkin: { en: "KOS check-in", zh: "歌王签到", id: "Check-in KOS" },
  whatsapp: { en: "WhatsApp", zh: "WhatsApp", id: "WhatsApp" },
  server: { en: "Server", zh: "服务器", id: "Server" },
};

async function alertStaff(e: ErrorRecord, burst: number) {
  const { notifyStaffI18n } = await import("./rebornGame");
  const { pick } = await import("./i18n");
  const name = AREA_NAME[e.area];
  await notifyStaffI18n("app_error", (lang) => ({
    title: pick(lang, { en: `⚠️ ${name.en} error`, zh: `⚠️ ${name.zh}出错`, id: `⚠️ Error ${name.id}` }),
    body: burst >= 5
      ? pick(lang, { en: `${burst} errors in 10 min. Latest: ${e.message}`, zh: `10 分钟内出错 ${burst} 次。最新：${e.message}`, id: `${burst} error dalam 10 menit. Terbaru: ${e.message}` }).slice(0, 240)
      : `${e.message}`.slice(0, 240),
  }), { path: "/reborn-admin?tab=Errors", area: e.area }, { adminsOnly: true });
}

// Records failed (4xx/5xx) watched API calls, with the server's own message.
export function installErrorWatch(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const area = areaForPath(req.path);
    if (!area) return next();
    let body: any;
    const json = res.json.bind(res);
    res.json = ((b: any) => { body = b; return json(b); }) as any;
    res.on("finish", () => {
      const status = res.statusCode;
      if (status < 400 || status === 401 || status === 304) return; // 401 = just logged out
      if (status === 404 && req.method === "GET") return;          // missing image etc.
      void recordError({
        area, source: "app", method: req.method, path: req.originalUrl.split("?")[0], status,
        message: String(body?.message || body?.error || res.statusMessage || `HTTP ${status}`),
        userId: getUserId(req), detail: safeBody(req.body), expected: !!body?.needTable,
      });
    });
    next();
  });
}

// The app reports calls that never reached the server (network down, timeout).
export function registerClientErrorRoute(app: Express) {
  app.post("/api/client-error", (req, res) => {
    const path = String(req.body?.path || "").split("?")[0];
    const area = areaForPath(path);
    if (area) void recordError({ area, source: "client", method: String(req.body?.method || "").slice(0, 8), path, status: 0, message: clip(req.body?.message || "Network error", 300), userId: getUserId(req), detail: clip(req.body?.agent || "", 200) });
    res.json({ ok: true });
  });
}

export async function listErrors(opts: { area?: string; days?: number }) {
  const days = Math.min(30, Math.max(1, Number(opts.days) || 7));
  const area = ERROR_AREAS.includes(opts.area as ErrorArea) ? opts.area : null;
  const rows = await db.execute(sql`SELECT e.id, e.area, e.source, e.method, e.path, e.status, e.message, e.user_id AS "userId", e.detail, to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
      COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email, u.phone_number) AS "userName"
    FROM app_errors e LEFT JOIN users u ON u.id = e.user_id
    WHERE e.created_at > now() - make_interval(days => ${days}) ${area ? sql`AND e.area = ${area}` : sql``}
    ORDER BY e.created_at DESC LIMIT 300`);
  const counts = await db.execute(sql`SELECT area, count(*)::int AS n, count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS today
    FROM app_errors WHERE created_at > now() - make_interval(days => ${days}) GROUP BY area`);
  return { rows: (rows as any).rows || rows, counts: (counts as any).rows || counts };
}

export async function clearErrors(area?: string) {
  if (ERROR_AREAS.includes(area as ErrorArea)) await db.execute(sql`DELETE FROM app_errors WHERE area = ${area}`);
  else await db.execute(sql`DELETE FROM app_errors`);
}

// Keep 30 days.
export function startErrorCleanup() {
  const run = () => db.execute(sql`DELETE FROM app_errors WHERE created_at < now() - interval '30 days'`).catch(() => {});
  setTimeout(run, 60_000);
  setInterval(run, 6 * 3600_000);
}
