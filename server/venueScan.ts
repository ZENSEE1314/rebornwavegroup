// "Find nearby": a small program on a PC at the venue (client/public/venue-scan.mjs) looks for CCTV cameras and TVs on
// the venue's own network — which a web page or this server in the cloud cannot see — and reports them here. The admin
// then adds the ones found from the Security / TV tabs. The program signs in with a token made per company.
import type { Express, Request, Response } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";

export const DEVICE_KINDS = ["camera", "tv"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

export interface NearbyDevice { ip: string; kind: DeviceKind; name: string; model: string; rtsp: string; via: string; seenAt: string }

const TOKEN_KEY = "venueBridgeToken";
const DEVICES_KEY = "venueDevices";
const SCAN_REQUESTED_KEY = "venueScanRequestedAt";
const LAST_REPORT_KEY = "venueLastReportAt";
const LAST_SEEN_KEY = "venueBridgeSeenAt";
const MAX_DEVICES = 200;
const MAX_TEXT = 120;
const MAX_URL = 300;
const TOKEN_BYTES = 18;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export interface VenueScanDeps {
  requireStaff(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  isAdmin(req: Request): Promise<boolean>;
  readSetting(key: string): Promise<string | null>;
  writeSetting(key: string, value: string): Promise<void>;
  companySlug(): string;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

export function cleanDevices(raw: unknown, seenAt: string): NearbyDevice[] {
  if (!Array.isArray(raw)) return [];
  const found: NearbyDevice[] = [];
  for (const item of raw.slice(0, MAX_DEVICES)) {
    const ip = text(item?.ip, 15);
    const kind = DEVICE_KINDS.find((candidate) => candidate === item?.kind);
    if (!IPV4.test(ip) || !kind) continue;
    const rtsp = text(item?.rtsp, MAX_URL);
    found.push({ ip, kind, name: text(item?.name, MAX_TEXT) || ip, model: text(item?.model, MAX_TEXT), rtsp: /^rtsp:\/\/[^\s]+$/i.test(rtsp) ? rtsp : "", via: text(item?.via, 20), seenAt });
  }
  return found;
}

/** A new scan replaces what was found before for the same address and kind; devices not seen again stay listed. */
export function mergeDevices(known: NearbyDevice[], fresh: NearbyDevice[]): NearbyDevice[] {
  const byKey = new Map(known.map((device) => [`${device.kind}:${device.ip}`, device]));
  for (const device of fresh) byKey.set(`${device.kind}:${device.ip}`, device);
  return [...byKey.values()].sort((a, b) => b.seenAt.localeCompare(a.seenAt)).slice(0, MAX_DEVICES);
}

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

export function registerVenueScanRoutes(app: Express, deps: VenueScanDeps) {
  const readStoredDevices = async (): Promise<NearbyDevice[]> => {
    try {
      const list = JSON.parse((await deps.readSetting(DEVICES_KEY)) || "[]");
      return Array.isArray(list) ? list.map((item: NearbyDevice) => ({ ...cleanDevices([item], String(item?.seenAt || ""))[0] })).filter((device) => device.ip) : [];
    } catch { return []; }
  };

  const bridgeAllowed = async (req: Request, res: Response): Promise<boolean> => {
    const expected = (await deps.readSetting(TOKEN_KEY)) || "";
    if (sameToken(String(req.get("x-bridge-token") || ""), expected)) return true;
    res.status(401).json({ message: "Bad bridge token" });
    return false;
  };

  app.get("/api/reborn/security/nearby", deps.requireStaff(async (req, res) => {
    const [token, requestedAt, reportedAt, seenAt, devices, canEdit] = await Promise.all([
      deps.readSetting(TOKEN_KEY), deps.readSetting(SCAN_REQUESTED_KEY), deps.readSetting(LAST_REPORT_KEY), deps.readSetting(LAST_SEEN_KEY),
      readStoredDevices(), deps.isAdmin(req),
    ]);
    res.json({
      devices, canEdit, hasToken: Boolean(token), token: canEdit ? token || "" : "", company: deps.companySlug(),
      lastSeenAt: seenAt || "", scanning: Boolean(requestedAt) && (requestedAt || "") > (reportedAt || ""),
    });
  }));

  app.post("/api/reborn/security/nearby/scan", deps.requireStaff(async (_req, res) => {
    await deps.writeSetting(SCAN_REQUESTED_KEY, new Date().toISOString());
    res.json({ ok: true });
  }));

  app.post("/api/reborn/security/nearby/token", deps.requireAdmin(async (_req, res) => {
    const token = randomBytes(TOKEN_BYTES).toString("hex");
    await deps.writeSetting(TOKEN_KEY, token);
    res.json({ token });
  }));

  // ---- the venue program ----

  app.get("/api/venue-bridge/poll", async (req, res) => {
    if (!(await bridgeAllowed(req, res))) return;
    const [requestedAt, reportedAt] = await Promise.all([deps.readSetting(SCAN_REQUESTED_KEY), deps.readSetting(LAST_REPORT_KEY)]);
    await deps.writeSetting(LAST_SEEN_KEY, new Date().toISOString());
    res.json({ scan: Boolean(requestedAt) && (requestedAt || "") > (reportedAt || "") });
  });

  app.post("/api/venue-bridge/report", async (req, res) => {
    if (!(await bridgeAllowed(req, res))) return;
    const now = new Date().toISOString();
    const merged = mergeDevices(await readStoredDevices(), cleanDevices(req.body?.devices, now));
    await deps.writeSetting(DEVICES_KEY, JSON.stringify(merged));
    await deps.writeSetting(LAST_REPORT_KEY, now);
    await deps.writeSetting(LAST_SEEN_KEY, now);
    res.json({ ok: true, count: merged.length });
  });
}
