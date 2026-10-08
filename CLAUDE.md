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

## Companies and their data (BridgeX tenants)

- Every company other than Reborn keeps its member-app data apart. `bridge_companies.data_mode`:
  `schema` = its own data space on this server (Postgres schema `tenant_<id>`, the default
  for new companies), `dedicated` = its own server + database (`server_url`), `shared` =
  the platform's own tables (only Reborn belongs there).
- `server/tenantSpace.ts` resolves the company of each request (its own domain, else the
  `X-Tenant-Slug` header / `bx_tenant` cookie on the platform host; `rebornwave.group`,
  `/api/v1/*` and the `/bridgex` console are always platform data) and runs it inside that
  space. `db` (server/db.ts) then talks to that schema only — never write `public.` in a
  query, and never read `platformDb` from member-app code.
- A tenant schema holds a copy of every table except `bridge_*` (exposed as views) and
  `sessions`. It is kept in step at startup (`syncAllTenantSpaces`): new tables and columns
  in `public` are mirrored. Column type changes need their own per-tenant step (see
  `ensureMoneyColumns` in server/index.ts).
- Use `homeCompanySlug()` (server/tenantContext.ts) instead of the literal
  `"reborn-wave-group"`. Module-level caches and in-memory state must be keyed by it.
- Logins are per space: each has its own `users` and its own session cookie
  (`reborn.sid` for the platform, `reborn.sid.tenant_<id>` for a company; server/multiAuth.ts),
  so tabs in different spaces never overwrite each other's login. The owner of a new company is copied in as its main admin.
- WhatsApp is per company through Meta's Cloud API: each company saves its own phone
  number ID + token in Admin > CRM (stored in its own `app_settings`), and Meta calls
  `/api/whatsapp/webhook/<slug>` with that company's verify token. The QR-linked number
  (server/whatsappWeb.ts) and the `WHATSAPP_*` env vars belong to the platform company only.
- Timers must run once per company: wrap the job in `inEveryDataSpace()` (server/tenantSpace.ts)
  as pet decay, daily tokens, the WhatsApp reminders and the error clean-up do. Not per
  company yet: the star-routes tournament timer.
- Only the home company stays in the platform's own tables: at startup any other company
  still `shared` is given its own space (`moveSharedCompaniesToOwnSpace`), empty, with its
  owners as admins. Starter content that describes Reborn (FAQ, club name, address, app
  download link) is not given to another company.
- Built-in texts say "Reborn" and "Doluruu": `brandText()` (client i18n) and `inBrandVoice()`
  (server i18n) swap in the company's name and the pet name its admin set (Admin > Pet,
  settings `petName` / `petImageUrl` / `petEggImageUrl`). Keep writing texts through
  `t()` / `tr()` / `pick()` so this keeps working.
- BridgeX, Reborn and each company are separate places with separate logins. On the BridgeX
  host a browser is either inside a company (entered through `/t/<slug>`) or on BridgeX
  itself, which never opens the Reborn member app; opening `/bridgex*` leaves the company.
  The BridgeX console is for the platform team only (`canUseBridgeXConsole`); a company's owner is not let in (on Reborn's own site its staff still open it for Reborn). A company's
  app admins are created and reset from the console (Companies > "Admins of the … app").
- Tab title, tab icon and share preview follow the brand of the page: server/pageBrand.ts
  rewrites the page head for a company or BridgeX (index.html itself is Reborn's), and the
  router in App.tsx keeps title + icon on the company while moving between pages.
- App designs: a company picks one of the designs in `shared/appSkins.ts` (BridgeX > White
  label, or the company's main admin in the app: Admin › Settings › App design,
  `/api/reborn/admin/app-skin`; both save `bridge_companies.theme.skin`, picker in
  components/AppSkinPicker.tsx). The app puts it on `<html data-skin>`
  and `client/src/skins.css` restyles the member app through variables. New shared app
  classes with hard-coded gold/purple need a line in that file's shared rules.
  Design and colour are separate choices: `theme.skin` is the shape, `theme.palette` one of
  the ten colours (`APP_PALETTES`), so the ten dark designs come in any colour. A palette
  sets `--pc-*` base colours (`html[data-palette]`); each design builds its `--sk-*` values
  from them — never write a fixed colour in a dark design's rules. No palette saved = the
  design's own colour (`paletteFor`); the light industry styles carry their own colours.
  Own colours: `theme.palette = "custom"` + `theme.colours` (`page`, `panel`, `accent`, `second`,
  #rrggbb, `cleanAppColours`) — `applyAppSkin` writes them as `--pc-*` on `<html style>` (the
  rest mixed from them, text on buttons picked by brightness). A light design keeps its page
  and takes only `accent` (`--sk-a`), so light-design rules must use `var(--sk-a)`, never their
  fixed main colour. Lettering: `theme.font` (one of `APP_FONTS`, "" = the design's own) sets
  `--sk-font` / `--sk-head-font`. Admin › Settings › App design shows the choice live and puts
  the saved look back if the admin leaves without saving.
  The ten dark designs must stay different from one another in shape, not colour: each has
  its own font (`font`, Google Fonts), main button, card, feature tile, section heading and
  bottom menu (skins.css "The ten designs"). Check a new one beside the others in one colour.
  Besides the ten dark looks there are five light business styles (`mode: "light"`):
  Professional (`pro`), Beauty Salon (`salon`), Retail Shop (`retail`), Spa & Wellness
  (`spa`), Restaurant & Café (`bistro`). Each has its own Google font (`font`, loaded by
  `applyAppSkin`), shapes, header, menu and buttons. A light design also sets
  `<html data-skin-mode="light">`, which turns the dark app's white text / dark panels /
  pale colour texts light (skins.css "light layer"). A full-screen scene that must stay
  dark (level up, login reward, gift scenes) gets the class `keep-dark`.
- Country + money: each company has a `country` (picked when it is created in BridgeX /
  the merchant sign-up, changeable on its company card) and a `local_currency` from it
  (shared/countries.ts: symbol, decimals — RP 0 decimals, S$ 2). The server knows the money
  of the request's company (`companyMoney()` / `roundMoney()` in server/companyMoney.ts,
  carried in the tenant registry); the app gets it from `/api/v1/tenant/resolve` (App.tsx →
  `setAppMoney`). Show amounts with `money()` from client/src/lib/money.ts — never write
  `"RP " +` — and round bills with `roundMoney` (cents for SGD). Texts may keep writing "RP":
  `brandText()` / `inBrandVoice()` swap it for the company's symbol.
- Payroll contributions (shared/payrollRules.ts, Admin › Payroll): each company starts with its
  country's statutory rates — Singapore CPF by age band (+ PR 1st/2nd-year rates, Ordinary
  Wage ceiling, employer-only SDL), Indonesia BPJS (JHT, JP, JKK, JKM, Kesehatan, with wage
  caps), Malaysia EPF/SOCSO/EIS, others none — saved per company in `app_settings.payrollRules`;
  the admin edits every number or resets to the country's. Staff profile: `birth_date`,
  `residency` (citizen | pr1 | pr2 | foreigner) and `statutory_on`. Recording pay books the
  gross as `salary` and the employer's share as `statutory_contribution`; the staff share is
  withheld (net pay = gross − staff share). Rates change yearly — update the defaults when
  governments do.
- Test: `scripts/tenant-isolation-test.mts` against an empty scratch database.
- A dedicated server sets `DEFAULT_COMPANY_SLUG` (+ `DEFAULT_COMPANY_NAME`) so the app
  runs as that company instead of Reborn.

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
- Arrival: staff tap ✓ Arrived, or it happens by itself when the member scans the QR of the
  table they booked (`markArrivedFromScan`, server/rebornGame.ts). The member's booking then
  shows "✓ arrived" and gets a welcome WhatsApp (`notifyArrived` → `sendToMember`, text
  `arrivedWelcome`; saved in the CRM chat). A booking auto-cancelled as a no-show whose guests turn up later gets
  "✓ Arrived (late)" in Admin › Bookings while its time hasn't ended (`lateArrivalOk`) — refused
  if the table was booked by someone else meanwhile (`tableTakenByOther`).
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
  couldn't be delivered). Cloud API reports failures later in the webhook (`statuses`,
  `recordFailedDelivery`): the reason goes to Admin › Errors and a ⚠️ line into the CRM chat —
  e.g. 131047 = the member hasn't written in 24h, so Meta refuses free text (needs a template).
  The address + map pin (`locationReply`) go out only once a booking is confirmed (staff
  Confirm, or a booking staff make themselves) — never with the "Booked, we'll confirm"
  reply (WhatsApp or app). `memberWaPhone` uses the chat the member last wrote from.
  Confirming / rejecting a booking tells the admin whether the WhatsApp went out
  (`whatsapp: sending | noPhone | offline` in the reply, shown in the toast).

## Facebook Messenger, Instagram DMs + Telegram (same bot as WhatsApp)

- server/socialChat.ts. A Messenger / Instagram chat is a CRM contact whose `phone` is the
  chat key `fb:<page-scoped id>` / `ig:<instagram-scoped id>` — use `chatKey()` (never
  `.replace(/\D/g, "")`) on a contact's phone, and `isSocialKey()` before treating it as a
  number. `sendWhatsApp` / `sendWhatsAppChoices` / `sendWhatsAppImage` hand chat keys to
  `sendSocial` (quick replies for buttons, `*bold*` stripped, long texts split, http image
  URLs only), so every bot flow and `sendToMember` work on all three; `sendToMember` falls
  back to the member's WhatsApp if Messenger refuses (Meta's 24 h window — outside it a
  Messenger update goes as `CONFIRMED_EVENT_UPDATE`, a staff reply as `HUMAN_AGENT`).
- Per company: Facebook Page ID + Page access token in Admin › CRM (`metaPageId` /
  `metaPageToken` app_settings). Meta posts `object: "page" | "instagram"` to the same
  webhook address and verify token as WhatsApp (`socialMessagesIn`).
- Sign-up in a Messenger / Instagram chat: language → name → WhatsApp number (stage
  `await_phone`), checked with a 4-digit code sent to that WhatsApp (`await_code`, 3 tries,
  3 codes a day) so nobody links someone else's account by typing their number; an existing
  account with that number is linked, else one is made with it (phone login, default
  password). *skip* → an account from the Facebook / Instagram chat itself (`auth_provider`
  facebook | instagram, no phone / email / password): the chat sends a one-tap login link
  (`/api/chat-login/:token`, single use, 30 min; *login* / *masuk* / *登录* in the chat sends
  a new one). Links are only made for those accounts.
- **Connect with Meta** (Admin › CRM, server/metaConnect.ts): one Facebook login finds the Page
  (+ its Instagram) and the WhatsApp Business number, saves their tokens / IDs and subscribes
  them to our webhook; several found → the admin picks (`metaPending`). Needs the platform's
  Meta app on the server: `META_APP_ID`, `META_APP_SECRET` (optional `META_LOGIN_CONFIG_ID`,
  `META_OAUTH_REDIRECT`, default `<APP_BASE_URL>/api/meta/oauth/callback`). One Meta app
  serves every company, so Meta posts all of them to the platform webhook
  `/api/whatsapp/webhook`; each entry goes to the company whose `metaPageId` / `metaIgId` /
  `waPhoneId` it names (`metaSpaceFor` in socialChat.ts — call `forgetMetaRoutes()` after
  saving any of them). The hand-entered settings stay under "Enter Meta details by hand".
- **Telegram** (a bot): chat key `tg:<chat id>`. The admin makes a bot with @BotFather and
  pastes its token in Admin › CRM (`connectTelegram`: getMe + setWebhook to
  `/api/telegram/webhook/<company slug | _ for the platform>` with a secret checked on every
  call); the card shows the bot's QR (t.me/<bot>) for customers to scan. Buttons are inline
  keyboards, posters are uploaded, no 24 h limit. Sign-up is the same as Messenger
  (`auth_provider` telegram on *skip*).

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
  day's total, a cash/card/credits/package-credit breakdown, best sellers and every
  salesperson's month sales vs target (target set in Payroll). No close button there:
  the day is closed in the POS ("Close POS day", shown to admins and managers;
  `/api/reborn/admin/venue/close`, `requireManager`). Server: `adminRole()` /
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
- Staff, managers and admins (Admin › Requests, `requireStaff`): Start / Done → next song,
  cancel one song, or cancel every waiting song of a table / guest who left, **Skip** the
  song on now, **Pause / Resume** (`songQueuePaused` app_settings key — while paused the song
  on now may end but the next doesn't start; `paused` is in the queue board so the karaoke
  bridge pauses playback; closing the day unpauses) and **Play next** on a waiting song
  (`song_requests.bumped_at`: goes ahead of the fair queue, latest move first).
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

## Game rewards (server/games.ts `saveScores`)

- No "play to N wins" series any more (single / best of 3 / 5 wins removed): every room is one game
  that keeps going (party games) or ends by its own rules (deck / round runs out); `winTarget` is 1.

- Every winner of a game: +1 rank star and 5 pet coins (`COINS_PER_WIN`); every loser: −1 rank
  star and no coins (`COINS_PER_PLAY` = 0). `room.results` ({win, lose}) drives each player's
  RANK UP / RANK DOWN flash.
- Never-ending party games (`CONTINUOUS`: Rock Paper Scissors, 789, Frog, In Between, Up or Down, Uno, 6 Cups) keep a win /
  loss tally per player (`tallyAdd`, shown live in `ContinuousBoard`). The host ends the game
  ("End game & rank", `/rooms/:code/finish`, needs at least one played round): players are ranked by
  wins, then fewest losses — 4+ players: top 3 win (1st/2nd/3rd), the rest lose; 3 or fewer:
  only the top player wins. Red Light, Green Light: everyone who finishes wins; if nobody finishes,
  whoever got nearest (most steps) wins and the rest lose. When a party game is down to its last player it is ranked the same
  way, including players who left (`tallyNames`). Tally: 789 = drinking 8/9 or downing the cup is a loss, other rolls a
  win; Frog = drinkers lose, the others win each reveal; In Between / Up or Down = right call win,
  wrong / same loss; Uno = the blaster loses, everyone else wins that game; 6 Cups = filling a
  cup is a win, drinking one a loss; Rock Paper Scissors = each game's loser loses, the others win,
  then a new game starts by itself after 4.5 s (`rpsNewGame`).
- Tie on the cut-off (same wins + losses either side of the last winning place) → a rock paper
  scissors rematch among the tied players (`startTiebreak` / `tbRound` / `tbResolve`, 20 s per
  round, no pick = random sign; `room.tiebreak` → `TiebreakPanel`); tied players who already left
  lose it. During a rematch only `act: "tb"` is accepted.
- One-round games: Red Riding Hood, Liar's Dice and Card Match (a discard ends it) = everyone except
  the loser wins; Stop the Timer = only the stopper(s) win, everyone else loses; Lucky Wheel = no
  winner or loser (just a drinking game). A player who leaves a one-round game mid-way
  (`room.quitters`) is counted as a loser when it ends.

## 6 Cups (server/games.ts `sc*`, app `SixCupGame`)

- Dice game category, 2–20 players. Host picks 1 die (6 cups, 1–6) or 2 dice (11 cups, 2–12 —
  two dice can't total 1) in the lobby (`scDice`). Roll: empty cup → fill it half or full, turn
  passes; cup with a drink → drink it (it empties) and roll again, until landing on an empty cup.
  2 dice: doubles reverse the turn order (`sc.dir`), the total still counts. Timers: 30 s to roll,
  20 s to fill (then half). Messages `gm.srv.sc*`, texts `gm.sc.*`.

## Uno (server/games.ts `uno*`, app `UnoGame`)

- Card games category, 2–6 players. 3 cards each; playing one draws one. Number cards add
  (A = 1 … 10); power cards always play: 7 reverse (adds nothing), J skip the next player (with 2 players J just passes the turn — no one plays twice in a row), Q −5,
  K −10 (the total may go below 0). Limit: 2 or 3 players 29, 4 → 39, +10 per extra player (`unoLimit`).
- Reaching the limit exactly is fine. Any card can be played (the app asks before a card that
  goes over); a player whose card takes the total OVER the limit BLASTS (`unoBust`): drinks 1 cup
  and loses; after 4.5 s a new game starts with the player after the blaster. 30 s turn timer (auto-plays the
  smallest card that fits, else a power card, else the smallest card — which blasts). Messages `gm.srv.uno*`, texts `gm.uno.*`.

## Card drinking games: In Between + Up or Down (server/games.ts `cd*`, app `CdGame`)

- Card games category, 2–10 players (`roomCap`), one 52-card deck (A = 1 … K = 13).
- **In Between** (`inbetween`): two open cards; the turn player calls inside (strictly between)
  or outside. **Up or Down** (`updown`): one open card; call up (higher) or down (lower).
- Wrong call = drink 1 cup, same number as an open card = drink double; either way the same
  player calls again until they win, then the turn passes on. In Between: after every draw the
  drawer puts the card on the left or right (`place`), setting the next call; Up or Down: the
  drawn card becomes the open card. Drinks are tallied per player (`cd.drinks`).
- Deck finished → a new deck (new game) starts by itself. Players can leave any time; the game
  ends when 1 player is left. Turn timers: 35 s to call, 20 s to place (then auto-played).
  Room messages: `gm.srv.ib*` / `gm.srv.ud*`; texts `gm.cd.*`, rules `gm.rules.inbetween|updown.*`.

## KOS gift levels + ranking tabs

- Two levels per member, 50 each (server/giftLevels.ts): **Gifter** (🎁, all
  KGOLD sent) and **Star** (⭐, all KGOLD received). Total KGOLD per level:
  Lv.2 at 1,000,000 then ×2 each level (base + growth), or an exact 49-number list of totals — admin Settings › Gift
  levels (`giftLevelSender*` / `giftLevelReceiver*`) shows all 50 level boxes for each; typing in a box saves
  the exact list (`giftLevel*List`), "Fill all levels from the formula" rewrites them; boxes must keep rising.
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

## Fast first load

- Pages are lazy-loaded in client/src/App.tsx (only `Login` is loaded up front);
  new pages use `lazy(() => import(...))`.
- Admin + POS texts (`i18n/admin.ts`, `i18n/pos.ts`) and games texts
  (`i18n/games.ts`) aren't in the main bundle: they load with their pages via
  `withText("staff" | "games", …)` / `loadTranslations()` in lib/i18n.ts. A
  member page that needs `admin.*`, `pos.*` or `gm.*` keys must load them the
  same way (or put the keys in another area file).
- Keep images small: resize/compress before adding (logo 512px, favicon 192px,
  photos ≤ 800–1000px). Hashed `/assets` files are cached for a year and served
  gzipped (`compression`).
- Videos: H.264 + AAC 96k with `-movflags +faststart` (plays while downloading);
  the full demo (`/demo.mp4`) is 540p CRF 28, background loops (`/videos/*`) 720p
  CRF 27.

## Homepage tower: one page per swipe

- The 3D tower (client/public/experience/app.js) moves one story card (`.beat`)
  per swipe, wheel/trackpad flick or arrow key, however fast (`STOPS`,
  `stepPage`, `goToStop`); input while a page is still sliding in is ignored, and
  a scroll that stops between pages (scrollbar drag) settles on the nearest one.
  Floor buttons and "skip" jump to a page. A new `.beat` becomes a page by itself.
- Moves use our own eased glide (`glideTo`), not the browser's smooth scroll: ~1.2–1.5 s
  inside a floor (e.g. 1F lounge → game rooms), ~2.4 s when the lift goes to another floor
  (game rooms → 2F private KTV), so each part is introduced in turn. Input during a glide
  is ignored (one part per swipe, however hard), and native swipe-scroll is off
  (`touch-action: none` on html/body in style.css; the video dialog keeps it).
  Bump `?v=` on app.js/style.css in index.html after changing them.
- Order of the pages: 1F lounge → game rooms → KOS board (right) → floor plan → lift (▲ 2F) →
  2F private KTV → KTV video (right) → beauty board → hair salon → floor plan → lift (▲ 3F) →
  3F VIP → Gold members → beauty rooms 6–8 board (left) → beauty spa → floor plan → lift (▲ 4F) →
  4F pets, food & family → meet our pets → restaurant board (left) → family → floor plan →
  lift (▲ 5F) → 5F live stage from afar → into the crowd → "every night" board (right) →
  floor plan. Every floor shows its plans (`.plan-beat`, text `planTitle`, camera at ~78% of
  the floor) and ends with a short "The lift · Going up · next floor" card (`.lift-beat`,
  texts `lift2`–`lift5` in `APP_TEXT`) placed where the camera is inside the car.
- Zoomed cards: every mesh of a zoomable card is drawn in the transparent pass (`zoomable()`),
  so the dark zoom veil sits behind the floor plan / photo instead of greying it.
- A card can steer the camera at its stop: `data-look="x,y,z"` / `data-pos="x,y,z"` (y above
  the floor; an x ending in `s` is × `SIDE_X()`, where the side boards stand) blend the walk's look-at / position in around the stop (`steerBeats`), e.g. 2F
  beauty looks at the facial cards, 2F hair salon steps right, 3F beauty spa turns left. Check
  on a phone-size (portrait) screenshot: portrait screens are narrow. A card's
  `data-a`/`data-b` window decides where its stop is (the middle), so place it where the
  camera frames that part (check with a screenshot); short windows still show fully.

## POS packages (visits + prepaid credit)

- Admin › Products › 📦 Package (`pos_products.package_kind`, server/memberPackages.ts):
  **Visits package** (`uses`, e.g. Spa ×10, optional valid days) or **Credit package**
  (`credit`: sell price e.g. 5,000,000 → `package_credit` 10,000,000, optional valid days,
  `perk_percent` / `perk_days`). Normal items have "Can be paid with package credit"
  (`credit_ok`) — untick for items credit can't buy. Packages hold no stock.
- Sold in the POS like any item (a member must be tagged): on payment they go into the
  member's packages (`member_packages`, `issuePackages`), shown in the app on /bottles
  ("My packages") and in POS › Packages.
- Visits: "Use 1" in POS › Packages or on the pay panel (adds an RP 0 line to the open
  bill) — `takePackageUses`, atomic, never below 0. Member gets a push.
- Credit: on the pay panel tick "Pay with package credit" — it pays only `credit_ok`
  items (share of the total incl. fee/tax, `quoteBill`); the rest is paid by cash /
  card / RP credits; a bill paid fully by credit has method `package`. Spent oldest-
  expiring first with atomic updates (`spendPackageCredit`), logged per bill in
  `member_package_uses`; `pos_tickets.package_credit_used` holds the amount.
- Credit used up → the perk starts: X% off every bill (not on package items) for N days
  or for life (`perk_from` / `perk_until`); applied automatically by the server (`quoteBill`,
  shown as "Member X%" in the discount) and the member gets a push.
- Refunds give package credit back (perk taken back if it was unlocked) and close the
  packages bought on that bill; cash refund = total − package credit. The day close /
  Daily sales show the package-credit part separately (`packageCredit`); its money was
  income when the package was sold.
- Reminders (`runPackageReminders` in server/whatsappBot.ts, hourly, 10:00–20:00 WIB):
  a package with visits / credit left gets a phone push + WhatsApp (saved in the CRM chat)
  when it expires within 7 days (every 2 days, daily in the last 3) or hasn't been used
  for 14 days (every 14 days); `member_packages.last_reminder_at`. Admin › CRM "run
  reminders" sends them right away (any hour).
- The POS asks `/api/reborn/pos/quote` for the bill (perk + credit) so the till shows
  exactly what the server will charge.

## Daily login reward (daily check-in)

- Admin › Settings › Daily login reward (`app_settings.dailyCheckin`, server/dailyCheckin.ts):
  on/off, "collect automatically when the member opens the app" (`autoClaim`, default on),
  "missing a day starts again from day 1" (`resetOnMiss`), and the reward of each of the 30
  days set one by one (`days[0..29]`) — points, RP credits (booked as a `checkin_reward`
  expense), tokens, KGOLD, a Prize from the Prizes tab, or none ("Copy day 1 to normal days"
  helper). Old daily/week/big settings convert on read (`cleanConfig`).
- It's a login reward: the first app open of the WIB day, on any page, collects it and plays
  the animation (`LoginRewardWatcher` in RebornLayout). With `autoClaim` off the member taps
  "Collect" on the home card (`DailyCheckinCard` in components/DailyCheckin.tsx) and the
  30-day calendar pops up once a day until they do.
  `daily_checkins` has one row per member per day (unique index, so double taps count
  once); `streak` is the day of the 30-day cycle; after day 30 a new round starts.
- Animations (by day number, `dayKind`): coins for a normal day, a gift box bursting open on days 7/14/21/28, a
  crown with rays + confetti on day 30 (index.css `dc-*`, sounds from lib/sfx.ts).
  A Prize reward goes to Spin › My prizes (`awardPrizeToUser`) for staff to redeem.
