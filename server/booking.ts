// Booking rules & helpers shared by the app, the public API and the WhatsApp bot.
//
// Hours (venue local time):
//   Sun–Thu: 5:00pm → 2:00am next day
//   Fri–Sat: 5:00pm → 3:00am next day
// Start slots run every 2 hours from 5pm. Guests may book longer than one slot.
import { and, eq, ne, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { appointments } from "@shared/schema";

const ACTIVE_BOOKING = ["pending", "scheduled", "confirmed", "blocked"];
export const BLOCK_ALL = "*ALL*"; // whole-area block marker (admin closes a slot)

// --- Venue timezone (admin-set) -----------------------------------------
// All booking wall-clock times (slots, "today", reminders) are interpreted in
// the club's country timezone, not the server's. Set from the `timezone`
// setting at boot and whenever settings change. Defaults to Indonesia (WIB).
let VENUE_TZ = "Asia/Jakarta";
export function setBookingTimezone(tz?: string) { if (tz && isValidTz(tz)) VENUE_TZ = tz; }
export function getBookingTimezone(): string { return VENUE_TZ; }
function isValidTz(tz: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
// Offset (ms) of VENUE_TZ vs UTC at a given instant (DST-safe).
function tzOffsetMs(at: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const m: any = {}; for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  const asUtc = Date.UTC(Number(m.year), Number(m.month) - 1, Number(m.day), Number(m.hour === "24" ? 0 : m.hour), Number(m.minute), Number(m.second));
  return asUtc - at.getTime();
}
// Wall-clock (y,mo,d,h,mi) in the venue timezone → absolute Date (UTC instant).
function venueWallToDate(y: number, mo: number, d: number, h: number, mi: number): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
  const off = tzOffsetMs(new Date(guess), VENUE_TZ);
  return new Date(guess - off);
}
// YYYY-MM-DD / weekday of an instant, read in the venue timezone.
function venueYmd(at: Date = new Date()): { y: number; mo: number; d: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: VENUE_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const m: any = {}; for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  return { y: Number(m.year), mo: Number(m.month), d: Number(m.day) };
}

const OPEN_HOUR = 17; // 5pm

// --- Admin booking rules --------------------------------------------------
// tableDayLock: once a table/room is booked at any time on a day, it can't be
// booked again that day (every slot for it disappears in the app & WhatsApp).
// Set from the `bookingTableDayLock` setting at boot and whenever settings change.
let TABLE_DAY_LOCK = false;
// Last booking time ("HH:MM"): no start times from this time onward (app + WhatsApp).
// Venue-wide default; an area's own lastBooking overrides it.
let LAST_BOOKING = "";
export function setBookingRules(r: { tableDayLock?: boolean; lastBooking?: string }) {
  if (r.tableDayLock !== undefined) TABLE_DAY_LOCK = !!r.tableDayLock;
  if (r.lastBooking !== undefined) LAST_BOOKING = /^\d{1,2}:\d{2}$/.test(r.lastBooking) ? r.lastBooking : "";
}
export function tableDayLockOn(): boolean { return TABLE_DAY_LOCK; }
// The business day (YYYY-MM-DD) a start time belongs to — after-midnight slots
// count towards the previous evening.
function businessDay(openHour: number, at: Date): string {
  const { y, mo, d } = venueYmd(new Date(at.getTime() - openHour * 3600_000));
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export const SLOT_TIMES = ["17:00", "19:00", "21:00", "23:00", "01:00"]; // 2-hour intervals

export function isWeekendNight(weekday: number): boolean {
  // Friday (5) and Saturday (6) nights run later.
  return weekday === 5 || weekday === 6;
}

export function hoursTextFor(weekday: number): string {
  return isWeekendNight(weekday) ? "5:00pm – 3:00am" : "5:00pm – 2:00am";
}

export function bookingHoursSummary(): string {
  return "Sun–Thu: 5pm–2am · Fri–Sat: 5pm–3am · 2-hour slots (stay longer if you like)";
}

// Slot start times for a given date (YYYY-MM-DD). Same list every day; the closing
// time differs by weekday and is shown separately.
export function slotsForDate(dateStr: string): string[] {
  return [...SLOT_TIMES];
}

function labelTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${ampm}`;
}

export function slotLabels(dateStr: string): string[] {
  return slotsForDate(dateStr).map(labelTime);
}

// Combine a YYYY-MM-DD date and HH:MM slot into a Date. Slots at/after midnight
// (e.g. 01:00) belong to the following calendar day.
export function slotToDate(dateStr: string, hhmm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let day = d || 1;
  if (h < OPEN_HOUR) day += 1; // after-midnight slot belongs to the next calendar day
  return venueWallToDate(y, mo || 1, day, h, mi);
}

export function todayStr(): string {
  const { y, mo, d } = venueYmd();
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Default table labels — match the Level 1 floor plan (VIP sofas, round tables, booths).
export const DEFAULT_TABLES = ["V1", "V2", "1", "2", "3", "4", "5", "T6", "T7", "T8", "T9"];
export function parseTables(raw?: string): string[] {
  const list = (raw || "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_TABLES;
}

// Bookable venue areas (by floor). Admin-editable via the bookingAreas setting (JSON).
// open/close are "HH:MM" (close may be after midnight, e.g. "03:00"). When omitted the
// area uses the default nightlife hours (5pm → 2am weekday / 3am weekend).
export interface DaySchedule { enabled?: boolean; open?: string; close?: string; }
export interface BookingArea { id: string; name: string; level: string; names?: { zh?: string; id?: string }; image?: string; tables: string[]; tableCaps?: Record<string, number>; maxPax?: number; enabled?: boolean; open?: string; close?: string; lastBooking?: string; schedule?: Record<string, DaySchedule>; }

// Max pax allowed for a table (per-table cap → area default → generous fallback).
// Max guests for a table: its own max, else the area's max. The admin can also
// choose "no max" (stored as -1) for a table; no max set anywhere = no max.
export const NO_MAX_PAX = 999;
export function tableCap(a: BookingArea, table?: string): number {
  const own = table && a.tableCaps ? Number(a.tableCaps[table]) : 0;
  if (own === -1) return NO_MAX_PAX;
  if (own > 0) return own;
  if (a.maxPax && a.maxPax > 0) return a.maxPax;
  return NO_MAX_PAX;
}
export function hasPaxLimit(cap: number): boolean { return cap > 0 && cap < NO_MAX_PAX; }
export const DEFAULT_AREAS: BookingArea[] = [
  { id: "l1-game", name: "Game House", level: "Level 1", image: "", tables: [], enabled: true },
  { id: "l1-ktv", name: "KTV Lounge", level: "Level 1", image: "", tables: ["V1", "V2", "1", "2", "3", "4", "5", "T6", "T7", "T8", "T9"], enabled: true },
  { id: "beauty", name: "Beauty Service", level: "Level 2 & 3", image: "", tables: [], enabled: true, open: "10:00", close: "21:00" },
  { id: "l2-ktv", name: "KTV Room", level: "Level 2", image: "", tables: ["Room 1", "Room 2", "Room 3", "Room 4"], enabled: true, open: "10:00", close: "03:00" },
  { id: "l3-vip", name: "VIP KTV Room", level: "Level 3", image: "", tables: ["VIP 1", "VIP 2"], enabled: true, open: "10:00", close: "03:00" },
  { id: "l4-pet", name: "Pet Room", level: "Level 4", image: "", tables: [], enabled: true, open: "10:00", close: "21:00" },
  { id: "restaurant", name: "Restaurant", level: "Level 4 & 5", image: "", tables: [], enabled: true, open: "10:00", close: "03:00" },
];
export function parseAreas(raw?: string): BookingArea[] {
  if (raw) {
    try {
      const a = JSON.parse(raw);
      if (Array.isArray(a) && a.length) return a.map((x: any, i: number) => ({
        id: String(x.id || `area-${i}`), name: String(x.name || `Area ${i + 1}`), level: String(x.level || ""),
        image: x.image || "", tables: Array.isArray(x.tables) ? x.tables.map(String) : [],
        names: (x.names && typeof x.names === "object") ? { zh: x.names.zh ? String(x.names.zh) : undefined, id: x.names.id ? String(x.names.id) : undefined } : undefined,
        tableCaps: (x.tableCaps && typeof x.tableCaps === "object") ? x.tableCaps : undefined,
        maxPax: Number(x.maxPax) > 0 ? Number(x.maxPax) : undefined,
        enabled: x.enabled !== false, open: x.open || "", close: x.close || "", lastBooking: /^\d{1,2}:\d{2}$/.test(x.lastBooking || "") ? x.lastBooking : "",
        schedule: (x.schedule && typeof x.schedule === "object") ? x.schedule : undefined,
      }));
    } catch { /* fall back */ }
  }
  return DEFAULT_AREAS;
}
// Area names/levels in the member's language. Admin-entered translations win;
// the standard area names and "Level N" are translated automatically.
const AREA_NAME_T: Record<string, { zh: string; id: string }> = {
  "game house": { zh: "游戏屋", id: "Rumah Permainan" },
  "ktv lounge": { zh: "KTV 酒廊", id: "Lounge KTV" },
  "beauty service": { zh: "美容服务", id: "Layanan Kecantikan" },
  "ktv room": { zh: "KTV 包厢", id: "Ruang KTV" },
  "vip ktv room": { zh: "VIP KTV 包厢", id: "Ruang KTV VIP" },
  "pet room": { zh: "宠物房", id: "Ruang Hewan Peliharaan" },
  "restaurant": { zh: "餐厅", id: "Restoran" },
};
export function areaNameIn(a: { name: string; names?: { zh?: string; id?: string } }, lang: string): string {
  if (lang !== "zh" && lang !== "id") return a.name;
  return a.names?.[lang] || AREA_NAME_T[a.name.trim().toLowerCase()]?.[lang] || a.name;
}
export function areaLevelIn(level: string, lang: string): string {
  if (!level || (lang !== "zh" && lang !== "id")) return level;
  return level.replace(/^Level\s+(.+)$/i, (_m, n) => (lang === "zh" ? `${n} 楼` : `Lantai ${n}`));
}

export function enabledAreas(raw?: string): BookingArea[] { return parseAreas(raw).filter((a) => a.enabled !== false); }

// --- Per-area hours & slots ---------------------------------------------
function hourOf(hm?: string): number | null { if (!hm) return null; const h = Number(hm.split(":")[0]); return Number.isFinite(h) ? h : null; }
export function areaOpenHour(a: BookingArea): number { return hourOf(a.open) ?? OPEN_HOUR; }
function areaCloseHour(a: BookingArea): number { return hourOf(a.close) ?? 2; } // default 2am

// Hourly start slots from open up to (but not including) close; close may be next-day.
// 1am and 2am are never offered as a start (too close to closing for everyone).
const EXCLUDED_START_HOURS = new Set([1, 2]);
export function areaSlots(a: BookingArea): string[] {
  const open = areaOpenHour(a), close = areaCloseHour(a);
  const span = (close <= open ? close + 24 : close) - open; // hours the venue is open
  const out: string[] = [];
  for (let t = 0; t < span; t += 1) {
    const h = (open + t) % 24;
    if (EXCLUDED_START_HOURS.has(h)) continue;
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out.length ? out : [...SLOT_TIMES];
}
export function areaSlotLabels(a: BookingArea): string[] { return areaSlots(a).map(labelTime); }
export function areaHoursText(a: BookingArea, weekday: number): string {
  if (a.open && a.close) return `${labelTime(a.open)} – ${labelTime(a.close)}`;
  return hoursTextFor(weekday); // default nightlife hours
}

// --- Per-weekday schedule (overrides the area's default hours per day) ---
function weekdayOfDate(dateStr: string): number { const [y, m, d] = dateStr.split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1).getDay(); }
// Effective config for a given weekday: schedule override merged over the area default.
export function areaDayConfig(a: BookingArea, weekday: number): { enabled: boolean; open?: string; close?: string } {
  const s = a.schedule?.[String(weekday)];
  return { enabled: s ? s.enabled !== false : true, open: (s?.open || a.open) || "", close: (s?.close || a.close) || "" };
}
function slotsFromHours(open: number, close: number): string[] {
  const span = (close <= open ? close + 24 : close) - open;
  const out: string[] = [];
  for (let t = 0; t < span; t += 1) { const h = (open + t) % 24; if (EXCLUDED_START_HOURS.has(h)) continue; out.push(`${String(h).padStart(2, "0")}:00`); }
  return out;
}
export function areaSlotsForDate(a: BookingArea, dateStr: string): string[] {
  const cfg = areaDayConfig(a, weekdayOfDate(dateStr));
  if (!cfg.enabled) return []; // closed this weekday
  const open = hourOf(cfg.open) ?? OPEN_HOUR, close = hourOf(cfg.close) ?? 2;
  const out = slotsFromHours(open, close);
  return cutAtLastBooking(out.length ? out : [...SLOT_TIMES], open, a.lastBooking || LAST_BOOKING);
}
// Drop start times at/after the last booking time (minutes counted from opening,
// so a cut-off after midnight works for late-night areas).
function cutAtLastBooking(slots: string[], openHour: number, last: string): string[] {
  if (!last) return slots;
  const fromOpen = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return ((h * 60 + (m || 0)) - openHour * 60 + 1440) % 1440; };
  const cut = fromOpen(last);
  if (cut <= 0) return slots; // a cut-off at opening time would close the day — ignore it
  return slots.filter((s) => fromOpen(s) < cut);
}
export function areaSlotLabelsForDate(a: BookingArea, dateStr: string): string[] { return areaSlotsForDate(a, dateStr).map(labelTime); }
export function areaHoursTextForDate(a: BookingArea, dateStr: string): string {
  const cfg = areaDayConfig(a, weekdayOfDate(dateStr));
  if (!cfg.enabled) return "Closed";
  if (cfg.open && cfg.close) return `${labelTime(cfg.open)} – ${labelTime(cfg.close)}`;
  return hoursTextFor(weekdayOfDate(dateStr));
}
export function areaOpenHourForDate(a: BookingArea, dateStr: string): number {
  const cfg = areaDayConfig(a, weekdayOfDate(dateStr));
  return hourOf(cfg.open) ?? OPEN_HOUR;
}
// Combine date + slot for a given area (after-midnight slots roll to the next day).
export function areaSlotToDate(a: BookingArea, dateStr: string, hhmm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let day = d || 1;
  if (h < areaOpenHour(a)) day += 1;
  return venueWallToDate(y, mo || 1, day, h, mi);
}

// The exact appointmentDate for an area/date/slot (after-midnight slots roll over).
export function bookingWhen(areaLabelOrOpenHour: BookingArea | number, dateStr: string, hhmm: string): Date {
  const openHour = typeof areaLabelOrOpenHour === "number" ? areaLabelOrOpenHour : areaOpenHour(areaLabelOrOpenHour);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let day = d || 1;
  if (h < openHour) day += 1;
  return venueWallToDate(y, mo || 1, day, h, mi);
}
function areaLabel(a: BookingArea): string { return `${a.name} (${a.level})`; }

// Is the whole area closed (admin block) for that start time?
export async function isAreaBlocked(a: BookingArea, when: Date): Promise<boolean> {
  const rows = await db.select().from(appointments).where(and(
    eq(appointments.notes, `${areaLabel(a)} / ${BLOCK_ALL}`),
    eq(appointments.appointmentDate, when),
  ));
  return rows.some((r) => r.status === "blocked");
}

// Is a specific table/room already booked (or blocked) for that exact start time?
export async function isTableTaken(a: BookingArea, table: string, when: Date): Promise<boolean> {
  if (await isAreaBlocked(a, when)) return true;
  if (!table) return false;
  if (TABLE_DAY_LOCK) {
    // Any active booking of this table on the same business day blocks it.
    const day = businessDay(areaOpenHour(a), when);
    const rows = await db.select().from(appointments).where(and(
      eq(appointments.notes, `${areaLabel(a)} / ${table}`),
      gte(appointments.appointmentDate, new Date(when.getTime() - 30 * 3600_000)),
      lte(appointments.appointmentDate, new Date(when.getTime() + 30 * 3600_000)),
    ));
    return rows.some((r) => ACTIVE_BOOKING.includes(r.status) && businessDay(areaOpenHour(a), new Date(r.appointmentDate)) === day);
  }
  // A booking holds its table for its whole length (e.g. 19:00 for 4h also covers 21:00).
  const t = when.getTime();
  const rows = await db.select().from(appointments).where(and(
    eq(appointments.notes, `${areaLabel(a)} / ${table}`),
    gte(appointments.appointmentDate, new Date(t - 12 * 3600_000)),
    lte(appointments.appointmentDate, when),
  ));
  return rows.some((r) => ACTIVE_BOOKING.includes(r.status) && occupies(r, t));
}
// Does this booking hold its table at time t? (start ≤ t < start + length)
function occupies(r: { appointmentDate: Date | string; duration: number | null }, t: number): boolean {
  const start = new Date(r.appointmentDate).getTime();
  return start <= t && t < start + Math.max(1, r.duration || 120) * 60_000;
}

// Tables already taken for an area across a whole day, grouped by slot value → [tables].
export async function takenTablesForDate(a: BookingArea, dateStr: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  if (!a.tables.length) return out;
  const slots = areaSlotsForDate(a, dateStr);
  if (!slots.length) return out;
  const openHour = areaOpenHourForDate(a, dateStr);
  const whens = slots.map((s) => bookingWhen(openHour, dateStr, s));
  // Look back far enough to catch a long booking that started before the first slot.
  const lo = new Date(Math.min(...whens.map((w) => w.getTime())) - 12 * 3600_000);
  const hi = new Date(Math.max(...whens.map((w) => w.getTime())) + 60_000);
  const rows = await db.select().from(appointments).where(and(
    gte(appointments.appointmentDate, lo), lte(appointments.appointmentDate, hi),
  ));
  const prefix = `${areaLabel(a)} / `;
  for (const r of rows) {
    if (!ACTIVE_BOOKING.includes(r.status) || !r.notes || !r.notes.startsWith(prefix)) continue;
    const table = r.notes.slice(prefix.length);
    const t = new Date(r.appointmentDate).getTime();
    if (table === BLOCK_ALL) { // whole slot blocked
      const idx = whens.findIndex((w) => w.getTime() === t);
      if (idx >= 0) out[slots[idx]] = [...a.tables];
      continue;
    }
    // A booking holds its table for every slot it covers, not just its start time.
    whens.forEach((w, idx) => {
      if (!occupies(r, w.getTime())) return;
      const list = (out[slots[idx]] ||= []);
      if (!list.includes(BLOCK_ALL) && !list.includes(table)) list.push(table);
    });
  }
  if (TABLE_DAY_LOCK) {
    // A table booked at any time today is taken for every slot today.
    const bookedToday = new Set<string>();
    for (const list of Object.values(out)) for (const tb of list) if (tb !== BLOCK_ALL) bookedToday.add(tb);
    for (const sl of slots) {
      const cur = out[sl] || [];
      if (cur.includes(BLOCK_ALL)) continue;
      out[sl] = Array.from(new Set([...cur, ...Array.from(bookedToday)]));
      if (!out[sl].length) delete out[sl];
    }
  }
  return out;
}

// Slots that still have at least one free table (or, for tableless areas, aren't blocked).
export async function availableSlotsForDate(a: BookingArea, dateStr: string): Promise<string[]> {
  const slots = areaSlotsForDate(a, dateStr);
  if (!slots.length) return [];
  const openHour = areaOpenHourForDate(a, dateStr);
  if (!a.tables.length) {
    const out: string[] = [];
    for (const s of slots) if (!(await isAreaBlocked(a, bookingWhen(openHour, dateStr, s)))) out.push(s);
    return out;
  }
  const taken = await takenTablesForDate(a, dateStr);
  return slots.filter((s) => {
    const t = taken[s] || [];
    if (t.includes(BLOCK_ALL)) return false;
    return a.tables.some((tb) => !t.includes(tb));
  });
}

// Free tables for a given date+slot.
export async function freeTablesForDateSlot(a: BookingArea, dateStr: string, slot: string): Promise<string[]> {
  if (!a.tables.length) return [];
  const taken = (await takenTablesForDate(a, dateStr))[slot] || [];
  if (taken.includes(BLOCK_ALL)) return [];
  return a.tables.filter((tb) => !taken.includes(tb));
}

// Other enabled areas that still have space on a date (to suggest when one is full).
export async function areasWithSpace(areas: BookingArea[], dateStr: string, except?: string): Promise<BookingArea[]> {
  const out: BookingArea[] = [];
  for (const x of areas) if (x.id !== except && (await availableSlotsForDate(x, dateStr)).length) out.push(x);
  return out;
}

// A date is fully booked when no slot has any availability.
export async function isDateFullyBooked(a: BookingArea, dateStr: string): Promise<boolean> {
  if (!areaSlotsForDate(a, dateStr).length) return false; // closed ≠ full
  return (await availableSlotsForDate(a, dateStr)).length === 0;
}

// Create a pending appointment (used by app + WhatsApp bot). Staff confirm in-app.
// Special requests guests can add to a booking (admin switch: bookingAskSpecial).
// Stored on the booking in English so every staff member reads the same thing.
export const BOOKING_OCCASIONS: { id: string; emoji: string; en: string }[] = [
  { id: "birthday", emoji: "🎂", en: "Birthday" },
  { id: "company", emoji: "🏢", en: "Company event" },
  { id: "anniversary", emoji: "💕", en: "Anniversary" },
  { id: "celebration", emoji: "🎉", en: "Celebration / party" },
];
// "🎂 Birthday · 🍰 Cake & decorations: we prepare: blue theme" — or just the note, or nothing.
// cake: "us" = guest wants us to prepare a cake with decorations, "self" = they bring their own.
export function specialRequestText(occasion?: string, note?: string, cake?: string): string | undefined {
  const o = BOOKING_OCCASIONS.find((x) => x.id === occasion);
  const n = String(note || "").trim().slice(0, 300);
  const c = cake === "us" ? "🍰 Cake & decorations: WE PREPARE" : cake === "self" ? "🍰 Cake & decorations: guest brings own" : "";
  if (!o && !n && !c) return undefined;
  const head = o ? `${o.emoji} ${o.en}` : c ? "🎂 Birthday" : "";
  return [head, c].filter(Boolean).join(" · ") + (n ? `${head || c ? ": " : "📝 "}${n}` : "");
}
// Does free text mention a birthday? (en / zh / id)
export function mentionsBirthday(text: string): boolean { return /birthday|bday|b-day|生日|ulang tahun|ultah/i.test(text); }

export async function createBooking(opts: {
  userId: string; dateStr: string; slot: string; partySize?: number; note?: string; hours?: number; table?: string; area?: string; openHour?: number; companyId?: number; branchId?: number;
}) {
  const when = (() => {
    const [y, mo, d] = opts.dateStr.split("-").map(Number);
    const [h, mi] = opts.slot.split(":").map(Number);
    let day = d || 1;
    if (h < (opts.openHour ?? OPEN_HOUR)) day += 1;
    return venueWallToDate(y, mo || 1, day, h, mi);
  })();
  const party = opts.partySize || 2;
  const bits = [opts.area, opts.table ? `Table ${opts.table}` : "", `Party of ${party}`, opts.note].filter(Boolean);
  const [row] = await db.insert(appointments).values({
    userId: opts.userId,
    companyId: opts.companyId ?? null,
    branchId: opts.branchId ?? null,
    title: [opts.area, opts.table && `Table ${opts.table}`].filter(Boolean).join(" · ") || "Booking",
    service: opts.area || "booking",
    description: bits.join(" · "),
    notes: [opts.area, opts.table].filter(Boolean).join(" / ") || null,
    appointmentDate: when,
    duration: (opts.hours || 2) * 60,
    cost: "0",
    status: "pending",
  }).returning();
  return row;
}
