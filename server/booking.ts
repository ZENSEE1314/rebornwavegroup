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

const OPEN_HOUR = 17; // 5pm
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
  const base = new Date(y, (mo || 1) - 1, d || 1, h, mi, 0, 0);
  if (h < OPEN_HOUR) base.setDate(base.getDate() + 1); // after-midnight slot
  return base;
}

export function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
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
export interface BookingArea { id: string; name: string; level: string; image?: string; tables: string[]; tableCaps?: Record<string, number>; maxPax?: number; enabled?: boolean; open?: string; close?: string; schedule?: Record<string, DaySchedule>; }

// Max pax allowed for a table (per-table cap → area default → generous fallback).
export function tableCap(a: BookingArea, table?: string): number {
  if (table && a.tableCaps && a.tableCaps[table] > 0) return a.tableCaps[table];
  if (a.maxPax && a.maxPax > 0) return a.maxPax;
  return 50;
}
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
        enabled: x.enabled !== false, open: x.open || "", close: x.close || "",
        schedule: (x.schedule && typeof x.schedule === "object") ? x.schedule : undefined,
      }));
    } catch { /* fall back */ }
  }
  return DEFAULT_AREAS;
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
  return out.length ? out : [...SLOT_TIMES];
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
  const base = new Date(y, (mo || 1) - 1, d || 1, h, mi, 0, 0);
  if (h < areaOpenHour(a)) base.setDate(base.getDate() + 1);
  return base;
}

// The exact appointmentDate for an area/date/slot (after-midnight slots roll over).
export function bookingWhen(areaLabelOrOpenHour: BookingArea | number, dateStr: string, hhmm: string): Date {
  const openHour = typeof areaLabelOrOpenHour === "number" ? areaLabelOrOpenHour : areaOpenHour(areaLabelOrOpenHour);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const base = new Date(y, (mo || 1) - 1, d || 1, h, mi, 0, 0);
  if (h < openHour) base.setDate(base.getDate() + 1);
  return base;
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
  const rows = await db.select().from(appointments).where(and(
    eq(appointments.notes, `${areaLabel(a)} / ${table}`),
    eq(appointments.appointmentDate, when),
  ));
  return rows.some((r) => ACTIVE_BOOKING.includes(r.status));
}

// Tables already taken for an area across a whole day, grouped by slot value → [tables].
export async function takenTablesForDate(a: BookingArea, dateStr: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  if (!a.tables.length) return out;
  const slots = areaSlotsForDate(a, dateStr);
  if (!slots.length) return out;
  const openHour = areaOpenHourForDate(a, dateStr);
  const whens = slots.map((s) => bookingWhen(openHour, dateStr, s));
  const lo = new Date(Math.min(...whens.map((w) => w.getTime())));
  const hi = new Date(Math.max(...whens.map((w) => w.getTime())) + 60_000);
  const rows = await db.select().from(appointments).where(and(
    gte(appointments.appointmentDate, lo), lte(appointments.appointmentDate, hi),
  ));
  const prefix = `${areaLabel(a)} / `;
  for (const r of rows) {
    if (!ACTIVE_BOOKING.includes(r.status) || !r.notes || !r.notes.startsWith(prefix)) continue;
    const table = r.notes.slice(prefix.length);
    const t = new Date(r.appointmentDate).getTime();
    const idx = whens.findIndex((w) => w.getTime() === t);
    if (idx < 0) continue;
    if (table === BLOCK_ALL) { out[slots[idx]] = [...a.tables]; continue; } // whole slot blocked
    if (!(out[slots[idx]] || []).includes(BLOCK_ALL)) (out[slots[idx]] ||= []).push(table);
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

// A date is fully booked when no slot has any availability.
export async function isDateFullyBooked(a: BookingArea, dateStr: string): Promise<boolean> {
  if (!areaSlotsForDate(a, dateStr).length) return false; // closed ≠ full
  return (await availableSlotsForDate(a, dateStr)).length === 0;
}

// Create a pending appointment (used by app + WhatsApp bot). Staff confirm in-app.
export async function createBooking(opts: {
  userId: string; dateStr: string; slot: string; partySize?: number; note?: string; hours?: number; table?: string; area?: string; openHour?: number;
}) {
  const when = (() => {
    const [y, mo, d] = opts.dateStr.split("-").map(Number);
    const [h, mi] = opts.slot.split(":").map(Number);
    const base = new Date(y, (mo || 1) - 1, d || 1, h, mi, 0, 0);
    if (h < (opts.openHour ?? OPEN_HOUR)) base.setDate(base.getDate() + 1);
    return base;
  })();
  const party = opts.partySize || 2;
  const bits = [opts.area, opts.table ? `Table ${opts.table}` : "", `Party of ${party}`, opts.note].filter(Boolean);
  const [row] = await db.insert(appointments).values({
    userId: opts.userId,
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
