# Reborn Wave Group — project rules

## Languages: English, 中文, Bahasa Indonesia — always all three

Every piece of text a member or staff user can see must exist in all three
languages. When you add or change any text — in the app, the admin panel, the
POS, the WhatsApp bot, push notifications or server replies — add/update the
English, Chinese and Bahasa versions in the same change. Never ship English-only
text.

- **App (client):** use `t("key", vars)` from `useTranslation()` (or
  `translate()` outside React) in `client/src/lib/i18n.ts`. Keys live in
  `client/src/lib/i18n/<area>.ts` (booking, games, home, venue, account, admin,
  pos, server) — every key needs `en`, `zh` and `id`. Format dates with
  `localeTag(language)`.
- **Server replies to the app:** `tr(req, { en, zh, id }, vars)` from
  `server/i18n.ts` (the app sends its language in the `X-Lang` header).
- **Push / in-app notifications:** `pick(await userLang(userId), { en, zh, id })`.
- **WhatsApp:** add a key to the `L()` table in `server/whatsappBot.ts` (or use
  the exported `waText`) and send it in `await langForPhone(phone, userId)` — a
  member's WhatsApp language follows their app language.
- **Game room messages** (`server/games.ts`) are shared by players with different
  languages: send a message key + values and translate on the client.

## Booking rules set by the admin

- `bookingTableDayLock` — a table booked at any time is closed for the rest of
  that day (app + WhatsApp).
- `bookingAskHours` — when off, the app and WhatsApp don't ask for hours and
  book 2 hours.
- `bookingAskSpecial` — when on, the app and WhatsApp ask for a special request
  (birthday, company event, anniversary, celebration + a note); it is saved on
  the booking. When off, the question is skipped.
- `bookingLastTime` (and an area's own `lastBooking`) — no booking start times
  from that time onward, in the app and WhatsApp.

- WhatsApp "what do you have?" (facilities / 有什么 / ada apa saja) replies with
  every enabled booking area + today's hours (`sendWhatWeHave`); members reply a
  number to book it, new numbers are asked their name to sign up. Adding an area
  in admin Settings adds it to this reply automatically.
- Table max pax: each table has its own max, "no max" (∞ in admin, stored as
  `tableCaps[t] = -1`), or falls back to the area's default (empty = no max).
  WhatsApp shows "Choose your preferred table" with the pax range.
- Birthday (chip or typed) asks "prepare a cake with decorations? yes / no,
  I'll bring my own" in the app and WhatsApp; saved on the booking.
- A booking holds its table for its whole length; full times show as Full in the
  app, and a full area/day suggests other areas with space (app + WhatsApp).

## WhatsApp hand-off to staff

- A message the bot can't answer (no FAQ match), or one that isn't about the
  club (delivery, courier, sales, jobs… — `OFF_TOPIC_RE`), gets one "Our team
  will get back to you shortly" reply, then the number is paused
  (`crm_contacts.bot_paused`): no more bot replies, staff get a notification
  for every new message, and an admin replies from Admin › CRM. The admin turns
  the bot back on per number in the CRM chat, or the member types *AI*
  (the hand-off reply tells them so) to get the auto-reply back.

## Events

- Admin events have a date (`startDate`, optional `endDate`). The home page shows
  upcoming events as a swipe-right row, nearest date first; an event disappears
  after its last day (no date = ongoing announcement, shown last).
  `upcomingEvents(date?)` in server/rebornGame.ts.
- App **Events page** (`/events`, home tile + menu) lists all upcoming events as
  A4 posters; tap for the full poster + text. WhatsApp menu option **4 Events**
  (or "events / 活动 / acara / promo") sends every upcoming event (poster + text).
- Booking a date that has an event shows its poster + text — app booking page
  and WhatsApp (sent right after the date is confirmed).

## KOS check-in + song queue set by the admin

- Every table has a fixed QR (`/kos?table=T&k=SIG`, admin: KOS → Venue QR →
  Table QR codes). Scanning checks the member in to KOS at that table; any
  number of people per table. A confirmed table booking checks the member in at
  that table automatically (from 2h before until it ends). The venue day runs
  08:00 → 08:00 WIB; at 8am everyone is checked out.
- A table QR opened while logged out (phone camera → website) goes to
  `/login?next=…` with a "Table X — log in or sign up" banner; after login or
  sign-up (any method) the member lands back on the link and is checked in.
  With the app installed, `rebornwave.group/kos…` opens in the app (Android App
  Links / iOS Universal Links via `/.well-known/*` — needs the
  `ANDROID_CERT_SHA256` and `APPLE_TEAM_ID` env vars on the server).
- The checked-in table pre-fills the member's order table.
- `songQueueMode` (`user` | `table`) and `songsPerTurn` (1–3) — the song queue
  gives each member/table that many songs per turn, first come first served;
  extra songs wait for the next round (`fairSongQueue` in server/rebornGame.ts).
  In `table` mode a member must be checked in at a table (table QR or confirmed
  table booking) before requesting — app and WhatsApp (`songNeedsTableScan`).
