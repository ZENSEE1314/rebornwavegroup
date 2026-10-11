// Security tab: the cameras staff can look at, and the "Officer at the door" check — when someone says they are police or
// another official, staff start a check, the managers get a WhatsApp, and the outcome (verified / not verified / refused)
// is kept in a log. Nothing here identifies anyone from a face or a plate: a real check is the official ID, the written
// assignment letter and a call to the station's own number.
import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import {
  MAX_OFFICER_LOG, cleanOfficerClose, cleanOfficerLog, cleanOfficerStart, cleanSecuritySetup,
  type OfficerCheck, type SecuritySetup,
} from "./securityLogic";

export interface Tri { en: string; zh: string; id: string }

export interface SecurityDeps {
  requireStaff(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  requireAdmin(handler: (req: Request, res: Response) => Promise<unknown>): (req: Request, res: Response) => unknown;
  isAdmin(req: Request): Promise<boolean>;
  staffName(req: Request): Promise<string>;
  readSetting(key: string): Promise<string | null>;
  writeSetting(key: string, value: string): Promise<void>;
  /** Sends the text to each phone in that phone's own language; with no phones, to the company's admins. */
  alert(phones: string[], text: Tri, vars: Record<string, string>): Promise<void>;
}

const SETUP_KEY = "securitySetup";
const LOG_KEY = "officerLog";
const LOG_SHOWN = 50;

const makeId = () => randomBytes(4).toString("hex");

const OPENED: Tri = {
  en: "🚨 Someone says they are an officer / official at the door.\nName: {name}\nBadge/ID: {badge}\nUnit: {unit}\nStaff: {staff}\nPlease come to the door. Do not let them in or hand anything over until the ID, the written assignment letter and a call to the station's own number have checked out.",
  zh: "🚨 门口有人自称是警察/官员。\n姓名：{name}\n证件/警号：{badge}\n单位：{unit}\n员工：{staff}\n请到门口。在核实证件、书面任务函并拨打警局官方电话确认之前，不要让对方进入或交出任何东西。",
  id: "🚨 Ada orang di pintu yang mengaku petugas / pejabat.\nNama: {name}\nNo. lencana/ID: {badge}\nUnit: {unit}\nStaf: {staff}\nMohon datang ke pintu. Jangan biarkan masuk atau serahkan apa pun sebelum ID, surat tugas tertulis, dan telepon ke nomor resmi kantor polisi terverifikasi.",
};

const CLOSED: Record<"verified" | "not_verified" | "refused", Tri> = {
  verified: {
    en: "✅ Officer check finished: VERIFIED.\nName: {name}\nBy: {staff}\nNote: {note}",
    zh: "✅ 官员核查结束：已核实。\n姓名：{name}\n处理人：{staff}\n备注：{note}",
    id: "✅ Pemeriksaan petugas selesai: TERVERIFIKASI.\nNama: {name}\nOleh: {staff}\nCatatan: {note}",
  },
  not_verified: {
    en: "⚠️ Officer check finished: NOT VERIFIED — treat as a possible impostor. Do not hand over money, phones or records. Call the owner or your lawyer.\nName: {name}\nBy: {staff}\nNote: {note}",
    zh: "⚠️ 官员核查结束：未能核实——请当作可能的冒充者处理。不要交出现金、手机或记录。请联系老板或律师。\n姓名：{name}\n处理人：{staff}\n备注：{note}",
    id: "⚠️ Pemeriksaan petugas selesai: TIDAK TERVERIFIKASI — anggap mungkin penipu. Jangan serahkan uang, ponsel, atau catatan. Hubungi pemilik atau pengacara.\nNama: {name}\nOleh: {staff}\nCatatan: {note}",
  },
  refused: {
    en: "ℹ️ Officer check finished: they left or refused to show proof.\nName: {name}\nBy: {staff}\nNote: {note}",
    zh: "ℹ️ 官员核查结束：对方离开或拒绝出示证明。\n姓名：{name}\n处理人：{staff}\n备注：{note}",
    id: "ℹ️ Pemeriksaan petugas selesai: mereka pergi atau menolak menunjukkan bukti.\nNama: {name}\nOleh: {staff}\nCatatan: {note}",
  },
};

async function loadSetup(deps: SecurityDeps): Promise<SecuritySetup> {
  const raw = await deps.readSetting(SETUP_KEY);
  let stored: unknown = null;
  try { stored = raw ? JSON.parse(raw) : null; } catch { /* unreadable value: start from an empty setup */ }
  return cleanSecuritySetup(stored, makeId);
}

async function loadLog(deps: SecurityDeps): Promise<OfficerCheck[]> {
  const raw = await deps.readSetting(LOG_KEY);
  try { return cleanOfficerLog(raw ? JSON.parse(raw) : []); } catch { return []; }
}

const saveLog = (deps: SecurityDeps, log: OfficerCheck[]) => deps.writeSetting(LOG_KEY, JSON.stringify(log.slice(0, MAX_OFFICER_LOG)));
const shown = (value: string) => value || "—";

export function registerSecurityRoutes(app: Express, deps: SecurityDeps) {
  app.get("/api/reborn/security/setup", deps.requireStaff(async (req, res) => {
    const setup = await loadSetup(deps);
    // Who is alerted, and editing, are for the main admin only.
    const canEdit = await deps.isAdmin(req);
    res.json({ ...setup, alertPhones: canEdit ? setup.alertPhones : [], canEdit });
  }));

  app.put("/api/reborn/security/setup", deps.requireAdmin(async (req, res) => {
    const setup = cleanSecuritySetup(req.body, makeId);
    await deps.writeSetting(SETUP_KEY, JSON.stringify(setup));
    res.json(setup);
  }));

  app.get("/api/reborn/security/officer-checks", deps.requireStaff(async (_req, res) => {
    res.json({ checks: (await loadLog(deps)).slice(0, LOG_SHOWN) });
  }));

  app.post("/api/reborn/security/officer-checks", deps.requireStaff(async (req, res) => {
    const start = cleanOfficerStart(req.body);
    const staffName = await deps.staffName(req);
    const check: OfficerCheck = { id: makeId(), at: new Date().toISOString(), staffName, ...start, outcome: "open" };
    await saveLog(deps, [check, ...(await loadLog(deps))]);
    const { alertPhones } = await loadSetup(deps);
    await deps.alert(alertPhones, OPENED, { name: shown(start.claimedName), badge: shown(start.badge), unit: shown(start.unit), staff: staffName });
    res.json({ check });
  }));

  app.post("/api/reborn/security/officer-checks/:id/close", deps.requireStaff(async (req, res) => {
    const end = cleanOfficerClose(req.body);
    if (!end) return res.status(400).json({ message: "Choose how the check ended" });
    const log = await loadLog(deps);
    const index = log.findIndex((check) => check.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Check not found" });
    if (log[index].outcome !== "open") return res.status(409).json({ message: "This check is already closed" });
    const staffName = await deps.staffName(req);
    const closed: OfficerCheck = { ...log[index], outcome: end.outcome, note: [log[index].note, end.note].filter(Boolean).join(" | "), closedAt: new Date().toISOString(), closedBy: staffName };
    log[index] = closed;
    await saveLog(deps, log);
    const { alertPhones } = await loadSetup(deps);
    await deps.alert(alertPhones, CLOSED[end.outcome], { name: shown(closed.claimedName), staff: staffName, note: shown(end.note) });
    res.json({ check: closed });
  }));
}
