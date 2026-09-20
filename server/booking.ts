// Booking rules & helpers shared by the app, the public API and the WhatsApp bot.
//
// Hours (venue local time):
//   Sun–Thu: 5:00pm → 2:00am next day
//   Fri–Sat: 5:00pm → 3:00am next day
// Start slots run every 2 hours from 5pm. Guests may book longer than one slot.
import { db } from "./db";
import { appointments } from "@shared/schema";

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
export interface BookingArea { id: string; name: string; level: string; image?: string; tables: string[]; }
export const DEFAULT_AREAS: BookingArea[] = [
  { id: "l1-game", name: "Game House", level: "Level 1", image: "", tables: [] },
  { id: "l1-ktv", name: "KTV Lounge", level: "Level 1", image: "", tables: ["V1", "V2", "1", "2", "3", "4", "5", "T6", "T7", "T8", "T9"] },
  { id: "beauty", name: "Beauty Service", level: "Level 2 & 3", image: "", tables: [] },
  { id: "l2-ktv", name: "KTV Room", level: "Level 2", image: "", tables: ["Room 1", "Room 2", "Room 3", "Room 4"] },
  { id: "l3-vip", name: "VIP KTV Room", level: "Level 3", image: "", tables: ["VIP 1", "VIP 2", "VIP 3"] },
  { id: "l4-pet", name: "Pet Room", level: "Level 4", image: "", tables: [] },
  { id: "restaurant", name: "Restaurant", level: "Level 4 & 5", image: "", tables: [] },
];
export function parseAreas(raw?: string): BookingArea[] {
  if (raw) {
    try {
      const a = JSON.parse(raw);
      if (Array.isArray(a) && a.length) return a.map((x: any, i: number) => ({
        id: String(x.id || `area-${i}`), name: String(x.name || `Area ${i + 1}`), level: String(x.level || ""),
        image: x.image || "", tables: Array.isArray(x.tables) ? x.tables.map(String) : [],
      }));
    } catch { /* fall back */ }
  }
  return DEFAULT_AREAS;
}

// Create a pending appointment (used by app + WhatsApp bot). Staff confirm in-app.
export async function createBooking(opts: {
  userId: string; dateStr: string; slot: string; partySize?: number; note?: string; hours?: number; table?: string; area?: string;
}) {
  const when = slotToDate(opts.dateStr, opts.slot);
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
