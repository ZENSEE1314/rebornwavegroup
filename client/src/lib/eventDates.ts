import { localeTag } from "@/lib/i18n";

// "Sat 10 Oct" or "Sat 10 – Sun 11 Oct" for an event's dates, in the reader's language.
export function eventDates(ev: { startDate?: string | null; endDate?: string | null }, language: string): string {
  if (!ev.startDate) return "";
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(localeTag(language as any), { weekday: "short", day: "numeric", month: "short" });
  const end = ev.endDate && ev.endDate > ev.startDate ? ev.endDate : "";
  return end ? `${fmt(ev.startDate)} – ${fmt(end)}` : fmt(ev.startDate);
}
