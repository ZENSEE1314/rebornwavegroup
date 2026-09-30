// Understands the booking date a guest types on WhatsApp, in English, 中文 or
// Bahasa Indonesia. Pure (no I/O) so it can be tested on its own.
//
//   { kind: "exact", date }      a real date was typed (13/10, 13 Oct, 10月13日,
//                                13 Oktober, 2026-10-13) → use it, no question
//   { kind: "relative", date }   today / tomorrow / 后天 / lusa / next Sunday /
//                                下个礼拜天 / minggu depan … → confirm with the guest
//   { kind: "askDay", weekOffset } "next week" / 下个礼拜 / minggu depan with no
//                                day → ask which day (0 = this week, 1 = next)
//   null                         not a date

export type DateInput =
  | { kind: "exact"; date: string }
  | { kind: "relative"; date: string }
  | { kind: "askDay"; weekOffset: number }
  | null;

const pad = (n: number) => String(n).padStart(2, "0");
function toIso(d: Date): string { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function fromIso(iso: string): Date { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
export function addDays(iso: string, n: number): string { const d = fromIso(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d); }
export function weekdayOfIso(iso: string): number { return fromIso(iso).getUTCDay(); } // 0 = Sunday
function validYmd(y: number, m: number, d: number): boolean {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
// A day/month without a year: this year, or next year if that date has passed.
function dayMonth(today: string, d: number, m: number): string | null {
  const y = Number(today.slice(0, 4));
  if (!validYmd(y, m, d) && !validYmd(y + 1, m, d)) return null;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return validYmd(y, m, d) && iso >= today ? iso : `${y + 1}-${pad(m)}-${pad(d)}`;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, januari: 1, feb: 2, february: 2, februari: 2, mar: 3, march: 3, maret: 3, apr: 4, april: 4,
  may: 5, mei: 5, jun: 6, june: 6, juni: 6, jul: 7, july: 7, juli: 7, aug: 8, august: 8, agu: 8, agt: 8, agustus: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, okt: 10, oktober: 10, nov: 11, november: 11, nop: 11, nopember: 11,
  dec: 12, december: 12, des: 12, desember: 12,
};
const ZH_NUM: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
const EN_WD: Array<[RegExp, number]> = [
  [/\bsun(day)?\b/, 0], [/\bmon(day)?\b/, 1], [/\btue(s|sday)?\b/, 2], [/\bwed(nesday)?\b/, 3],
  [/\bthu(r|rs|rsday)?\b/, 4], [/\bfri(day)?\b/, 5], [/\bsat(urday)?\b/, 6],
];
const ID_WD: Array<[RegExp, number]> = [
  [/\bsenin\b/, 1], [/\bselasa\b/, 2], [/\brabu\b/, 3], [/\bkamis\b/, 4], [/\bjum'?at\b/, 5], [/\bsabtu\b/, 6],
];

// Weekday named in the text (0 = Sunday), or null.
function weekdayIn(t: string): number | null {
  const zh = t.match(/(?:星期|礼拜|禮拜|周|週)([一二三四五六日天])/);
  if (zh) return ZH_NUM[zh[1]];
  for (const [re, n] of EN_WD) if (re.test(t)) return n;
  for (const [re, n] of ID_WD) if (re.test(t)) return n;
  // "minggu" is Sunday, but "minggu depan / minggu ini" means next/this week.
  if (/\bhari minggu\b/.test(t)) return 0;
  if (/\bminggu\b/.test(t) && !/\bminggu\s+(depan|ini|lalu|besok)\b/.test(t)) return 0;
  return null;
}
const NEXT_RE = /\bnext\b|下个|下個|下周|下週|下星期|下礼拜|下禮拜|\bdepan\b/;
const THIS_RE = /\bthis\b|这个|這個|这周|這週|本周|本週|这星期|这礼拜|\bini\b/;
const WEEK_RE = /\bweek\b|周|週|星期|礼拜|禮拜|\bminggu\b/;

// Monday-based index (Mon = 0 … Sun = 6).
const monIdx = (wd: number) => (wd + 6) % 7;
// The date of weekday `wd` in the week `weekOffset` weeks from this one (Mon–Sun weeks).
export function weekdayInWeek(today: string, wd: number, weekOffset: number): string {
  const monday = addDays(today, -monIdx(weekdayOfIso(today)));
  return addDays(monday, weekOffset * 7 + monIdx(wd));
}

export function parseDateInput(raw: string, today: string): DateInput {
  const t = String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;

  // ── Exact dates ──
  let m = t.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m && validYmd(+m[1], +m[2], +m[3])) return { kind: "exact", date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` };
  m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; if (validYmd(y, +m[2], +m[1])) return { kind: "exact", date: `${y}-${pad(+m[2])}-${pad(+m[1])}` }; }
  m = t.match(/\b(\d{1,2})[/.](\d{1,2})\b/); // 13/10 (day/month)
  if (m) { const iso = dayMonth(today, +m[1], +m[2]); if (iso) return { kind: "exact", date: iso }; }
  m = t.match(/(?:(\d{4})年)?\s*(\d{1,2})月\s*(\d{1,2})\s*[日号號]?/); // 10月13日
  if (m) {
    if (m[1] && validYmd(+m[1], +m[2], +m[3])) return { kind: "exact", date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` };
    const iso = dayMonth(today, +m[3], +m[2]); if (iso) return { kind: "exact", date: iso };
  }
  m = t.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?\b/); // 13 oct / 13 oktober 2026
  if (m && MONTHS[m[2]]) {
    const iso = m[3] ? (validYmd(+m[3], MONTHS[m[2]], +m[1]) ? `${m[3]}-${pad(MONTHS[m[2]])}-${pad(+m[1])}` : null) : dayMonth(today, +m[1], MONTHS[m[2]]);
    if (iso) return { kind: "exact", date: iso };
  }
  m = t.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/); // oct 13
  if (m && MONTHS[m[1]]) {
    const iso = m[3] ? (validYmd(+m[3], MONTHS[m[1]], +m[2]) ? `${m[3]}-${pad(MONTHS[m[1]])}-${pad(+m[2])}` : null) : dayMonth(today, +m[2], MONTHS[m[1]]);
    if (iso) return { kind: "exact", date: iso };
  }
  m = t.match(/^(\d{1,2})\s*[日号號]$|^(?:tanggal|tgl\.?)\s*(\d{1,2})$/); // 13号 / tanggal 13 → this month (or next)
  if (m) {
    const d = +(m[1] || m[2]); const [y, mo] = today.split("-").map(Number);
    let iso = validYmd(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
    if (!iso || iso < today) { const ny = mo === 12 ? y + 1 : y, nm = mo === 12 ? 1 : mo + 1; iso = validYmd(ny, nm, d) ? `${ny}-${pad(nm)}-${pad(d)}` : null; }
    if (iso) return { kind: "exact", date: iso };
  }

  // ── Relative days ──
  if (/大后天|大後天/.test(t)) return { kind: "relative", date: addDays(today, 3) };
  if (/day after tomorrow|后天|後天|\blusa\b/.test(t)) return { kind: "relative", date: addDays(today, 2) };
  if (/\btomorrow\b|\btmr\b|明天|明晚|\bbesok\b/.test(t)) return { kind: "relative", date: addDays(today, 1) };
  if (/\btoday\b|\btonight\b|今天|今晚|\bhari ini\b|\bmalam ini\b|\bsekarang\b/.test(t)) return { kind: "relative", date: today };

  // ── Weekdays ──
  const wd = weekdayIn(t);
  const extraWeek = /next\s+next|下下|minggu depan(nya)? lagi/.test(t) ? 1 : 0;
  if (wd !== null) {
    if (NEXT_RE.test(t)) return { kind: "relative", date: weekdayInWeek(today, wd, 1 + extraWeek) };
    if (THIS_RE.test(t)) {
      const d = weekdayInWeek(today, wd, 0);
      return { kind: "relative", date: d >= today ? d : addDays(d, 7) };
    }
    // Just a weekday: the coming one (today counts).
    return { kind: "relative", date: addDays(today, (wd - weekdayOfIso(today) + 7) % 7) };
  }
  // "next week" / "this week" with no day → ask which day
  if (WEEK_RE.test(t) && NEXT_RE.test(t)) return { kind: "askDay", weekOffset: 1 + extraWeek };
  if (WEEK_RE.test(t) && THIS_RE.test(t)) return { kind: "askDay", weekOffset: 0 };
  return null;
}

// Yes / no answers in all three languages.
export function yesNo(raw: string): "yes" | "no" | null {
  const t = String(raw || "").trim().toLowerCase().replace(/[.!。！~]+$/, "");
  if (/^(y|yes|yeah|yep|ok|okay|sure|correct|right|ya|iya|iyah|yoi|betul|benar|bener|oke|setuju|是|是的|对|對|对的|好|好的|没错|沒錯|嗯|可以|确定|確定)$/.test(t)) return "yes";
  if (/^(n|no|nope|not|wrong|tidak|tdk|nggak|ngga|gak|enggak|bukan|salah|否|不|不是|不对|不對|错|錯|不要)$/.test(t)) return "no";
  return null;
}
