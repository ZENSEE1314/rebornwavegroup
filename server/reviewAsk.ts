const HOUR_MS = 60 * 60 * 1000;
const VENUE_DAY_START_SHIFT_MS = HOUR_MS; // the venue day starts at 08:00 WIB = 01:00 UTC

const venueDayOf = (at: Date) => new Date(at.getTime() - VENUE_DAY_START_SHIFT_MS).toISOString().slice(0, 10);

/** True when this person was already asked for feedback in the same venue day (08:00 → 08:00 WIB). */
export function askedThisVenueDay(lastAskedAt: Date | string | null | undefined, now: Date): boolean {
  if (!lastAskedAt) return false;
  return venueDayOf(new Date(lastAskedAt)) === venueDayOf(now);
}
