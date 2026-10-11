// Pure rules for the Security tab (no database, no web server): cleaning the saved setup (cameras, the official
// station numbers, who gets the alert) and the "Officer at the door" reports staff write. Kept apart so it can be tested.

export const CAMERA_KINDS = ["image", "page"] as const;
export type CameraKind = (typeof CAMERA_KINDS)[number];

export interface Camera { id: string; name: string; kind: CameraKind; url: string; refreshSeconds: number }
export interface StationNumber { label: string; phone: string }
export interface SecuritySetup { cameras: Camera[]; stationNumbers: StationNumber[]; alertPhones: string[] }

export const OFFICER_OUTCOMES = ["open", "verified", "not_verified", "refused"] as const;
export type OfficerOutcome = (typeof OFFICER_OUTCOMES)[number];

export interface OfficerCheck {
  id: string;
  at: string;
  staffName: string;
  claimedName: string;
  badge: string;
  unit: string;
  note: string;
  outcome: OfficerOutcome;
  closedAt?: string;
  closedBy?: string;
}

export const MAX_CAMERAS = 32;
export const MAX_STATION_NUMBERS = 10;
export const MAX_ALERT_PHONES = 10;
export const MAX_OFFICER_LOG = 200;
export const MAX_REFRESH_SECONDS = 60;
const MAX_NAME = 60;
const MAX_URL = 500;
const MAX_NOTE = 500;
const PHONE_DIGITS = /^\d{8,15}$/;
const ID_FORMAT = /^[a-z0-9-]{1,40}$/;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const phoneOf = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : "");
const isWebAddress = (value: string) => /^https?:\/\/[^\s]+$/i.test(value);

export function cleanSecuritySetup(raw: unknown, makeId: () => string): SecuritySetup {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

  const ids = new Set<string>();
  const cameras: Camera[] = [];
  for (const item of list(source.cameras).slice(0, MAX_CAMERAS)) {
    const camera = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const url = text(camera.url, MAX_URL);
    if (!isWebAddress(url)) continue;
    let id = typeof camera.id === "string" && ID_FORMAT.test(camera.id) ? camera.id : makeId();
    while (ids.has(id)) id = makeId();
    ids.add(id);
    const refresh = Math.round(Number(camera.refreshSeconds));
    cameras.push({
      id,
      name: text(camera.name, MAX_NAME) || `Camera ${cameras.length + 1}`,
      kind: CAMERA_KINDS.includes(camera.kind as CameraKind) ? (camera.kind as CameraKind) : "image",
      url,
      refreshSeconds: Number.isFinite(refresh) ? Math.min(MAX_REFRESH_SECONDS, Math.max(0, refresh)) : 0,
    });
  }

  const stationNumbers: StationNumber[] = [];
  for (const item of list(source.stationNumbers).slice(0, MAX_STATION_NUMBERS)) {
    const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const phone = phoneOf(entry.phone);
    if (PHONE_DIGITS.test(phone)) stationNumbers.push({ label: text(entry.label, MAX_NAME), phone });
  }

  const alertPhones = Array.from(new Set(list(source.alertPhones).map(phoneOf).filter((phone) => PHONE_DIGITS.test(phone)))).slice(0, MAX_ALERT_PHONES);
  return { cameras, stationNumbers, alertPhones };
}

/** What staff type when someone says they are police or another official. */
export function cleanOfficerStart(raw: unknown): { claimedName: string; badge: string; unit: string; note: string } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { claimedName: text(source.claimedName, MAX_NAME), badge: text(source.badge, MAX_NAME), unit: text(source.unit, MAX_NAME), note: text(source.note, MAX_NOTE) };
}

/** How the check ended; "open" is not a way to end it. */
export function cleanOfficerClose(raw: unknown): { outcome: Exclude<OfficerOutcome, "open">; note: string } | null {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const outcome = source.outcome;
  if (outcome !== "verified" && outcome !== "not_verified" && outcome !== "refused") return null;
  return { outcome, note: text(source.note, MAX_NOTE) };
}

/** The newest checks first, capped; unreadable stored data is dropped. */
export function cleanOfficerLog(raw: unknown): OfficerCheck[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is OfficerCheck => !!item && typeof item === "object" && typeof (item as OfficerCheck).id === "string" && OFFICER_OUTCOMES.includes((item as OfficerCheck).outcome))
    .slice(0, MAX_OFFICER_LOG);
}
