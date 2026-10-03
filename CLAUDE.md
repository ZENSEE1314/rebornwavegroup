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
  that day (app + WhatsApp) — until the guests pay and leave (below).
- Booking statuses: ✓ Arrived in Admin › Bookings = `seated` (still holds the
  table; no-show auto-cancel skips it). When the table's last open POS bill is
  paid (`freeTableAfterBill` → `releaseTableAfterPayment` in server/booking.ts),
  or staff tap "✓ Paid & left", the booking becomes `completed` and ends at that
  moment, so the table can be booked again for the rest of the night (even with
  the day lock). Only a seated booking or one still active 15+ min after its
  start is released — never a booking whose guests haven't arrived yet.
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
- Song names are never handed off: after "scan your table QR first" the next
  message (30 min) is taken as the song name (`songWait`), and any message that
  is a library song title / pinyin starts a song request (`isLibrarySong`).

- Messages the club sends a member outside a chat flow (booking confirmed /
  cancelled / staff-booked, booking receipt, song "you're on now") go through
  `sendToMember` (server/whatsappBot.ts): retried once after 8s if WhatsApp was
  reconnecting, and saved to the member's chat in Admin › CRM (⚠️ in front if it
  couldn't be delivered).

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

## Error watch (Admin › Errors)

- `server/errorWatch.ts` records every failed (4xx/5xx) song request, booking,
  POS, shop order and KOS check-in API call (`areaForPath`), app calls that
  never reached the server (`/api/client-error`, sent by `apiRequest`), WhatsApp
  bot crashes / replies that didn't send / link errors (`waError`), and server
  crashes into `app_errors` (kept 30 days). Passwords/tokens are masked.
- Admin › Errors (main admin only) lists them by area with counts; main admins get a notification on any
  server error or 5+ errors of one area in 10 minutes (max one per kind per
  15 min). Normal "do this first" replies (e.g. `needTable`) are logged but
  never alerted. Add new areas to `areaForPath` + `admin.err.area.*`.
- Song request 400 in table mode: the All songs list now shows the "scan your
  table QR" card too, and app error toasts show the server's message without
  the "400:" prefix.

## Admin panel roles (client/src/pages/reborn-admin.tsx `tabsFor`)

- **Staff** (`users.role = staff`): Bookings, Requests, Redemptions, Bottles,
  Top-ups, Pet (activation codes + revival pills in one tab), Songs, Games,
  Events, Staff, Leaderboard, Feedback, POS. The Staff tab shows each
  salesperson's own target for the month (`/api/reborn/staff/my-target`) and
  links to Bookings to book or block a table and time for a customer.
- **Manager** = a staff account whose company role is `manager`
  (`bridge_company_members.role`; set as "manager" in Admin › Users). Managers get
  the staff tabs + **Daily sales** (`/api/reborn/manager/daily-sales`): the venue
  day's total, a cash/card/credits breakdown, best sellers, "close the day & clear guests"
  (`/api/reborn/admin/venue/close`, `requireManager`), and every salesperson's
  month sales vs target (target set in Payroll). Server: `adminRole()` /
  `requireManager`; the app asks `/api/reborn/my-role`.
- **Main admin** (`users.role = admin`): every tab.
- Daily sales and the day close count by venue day (08:00 → 08:00 WIB,
  `VENUE_DAY_OF`).

## Sign-up without email (phone-number login)

- Email is optional. WhatsApp sign-up asks for an email; replying *skip / no /
  tidak ada / 跳过 / 没有* (`NO_EMAIL_RE`) makes the account with the phone number
  only and replies with the login: phone number + default password
  (`readyPhone`). The app's sign-up form has "Email (optional)".
- Login accepts an email **or** a phone number in any format (08…, +62 8…, 628…):
  `usersByPhone` / `phoneKey` in server/multiAuth.ts. A phone number that
  already has an account can't sign up again without an email.

## Song queue without approval + karaoke system bridge

- No staff approval: a request (app or WhatsApp) joins tonight's fair queue
  straight away (`pending`), and the reply says the queue position. Statuses: `pending` (waiting)
  → `playing` (on now, one at a time) → `confirmed` (sung) / `skipped`;
  `rejected`/`cancelled` = cancelled. `advanceSongQueue` finishes the song on now and starts
  the first song of `fairSongQueue`; the singer gets "you're on now" (push +
  WhatsApp `songOnNow`) and the next one "you're up next". Only tonight's
  requests (venue day from 08:00) are in the queue; closing the day clears it.
- Everyone sees the queue: app Songs › **Queue** tab + a "Now singing" banner
  (`/api/reborn/song-queue`, first name + table only). Members can cancel their
  own waiting song.
- Staff (Admin › Requests): Start / Done → next song / Skip, cancel one song,
  or cancel every waiting song of a table / guest who left.
- Karaoke bridge (Admin › Requests › Karaoke system, main admin): make a token;
  a program at the club calls `GET /api/karaoke/queue`, `POST /api/karaoke/next`
  (`{finishedId, skip}`) and `POST /api/karaoke/songs` (song list
  `[{code,title,artist}]` → `songs.karaoke_code`) with header `X-Karaoke-Token`.
  Admins can also paste the song list ("code, title, artist" per line).

## Game rooms survive restarts

- Game rooms live in memory (server/games.ts) but every change is also saved to
  `game_rooms` (`persistRoom`, ~1/s per room). After a restart / deploy a room
  is loaded back the first time anyone asks for it (`getRoom`) and its turn
  timer restarts (`resumeRoom`): turn-based games (memory, cards, dice, 789,
  stack, riding, poker3, bridge, frog) carry on; real-time ones (tap, timer,
  wheel, rlgl, draw, rps) go back to the lobby ("restarted", host starts again).
  Use `getRoom(code)` in routes, never `rooms.get` directly; `dropRoom` deletes.

## KOS gift levels + ranking tabs

- Two levels per member, 50 each (server/giftLevels.ts): **Gifter** (🎁, all
  KGOLD sent) and **Star** (⭐, all KGOLD received). Total KGOLD per level:
  Lv.2 at 1,000,000 then ×2 each level (base + growth), or an exact 49-number list of totals — admin Settings › Gift
  levels (`giftLevelSender*` / `giftLevelReceiver*`; preview table there).
- The avatar ring (components/LevelRing.tsx `LevelAvatar`, by the higher of the
  two levels) changes every 5 levels: bronze 5, silver 10, gold 15, emerald 20,
  sapphire 25, amethyst 30, ruby 35, diamond 40 (spins), rainbow 45, legend 50 (👑).
- Level up → full-screen "LEVEL UP" animation (`LevelUpWatcher` in RebornLayout
  compares /api/reborn/kos/levels/me with the last seen levels); Star level ups
  also send a notification. Profile shows "My gift levels" with progress.
- KOS ranking tabs: Tonight (checked in, received since check-in) / This month
  (everyone, received this month); every row shows the member's top 3 gifters
  for that period (`/api/reborn/kos/leaderboard?period=`). Gift only to members
  checked in tonight.
- Big gifts with their own full-screen scene + synthesized sound (reborn-kos.tsx
  `sceneOf` / `GiftScene`, index.css `gs-*`, lib/sfx.ts `gift(kind)`): Kiss 💋
  250,000 · Doluruu Thumbs Up 👍 750,000 · Lion Roar 🦁 1,250,000 · Big Whale 🐋
  1,750,000 · Rocket 🚀 1,000,000,000 (plus car / fireworks / crown / diamonds).
  Added once to venues that already have gifts (`giftsV2Added_<company>`, claimed
  atomically so parallel requests never add duplicates; `dedupeGiftTypes` cleans
  old copies at startup). Gift lists are sorted cheapest first.
- Each ranked member's top 3 gifters show as a podium (`GifterPodium`: 2nd · 1st
  · 3rd, gold / silver / bronze crown + medal ring around their own level ring).
