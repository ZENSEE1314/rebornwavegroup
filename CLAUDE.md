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

- Every new function is built for all companies, not only Reborn: store its data through `db` / `appSettings` (per company), no module gate unless it truly needs one, and make any public page or address work for a company on the shared host (`?tenant=<slug>`).

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
- App functions per company: the member-app features (`APP_FEATURE_KEYS`, client list in
  lib/features.tsx) are switched per company — by BridgeX (App functions tab,
  `/api/v1/platform/companies/:id/app-features`) or the company's own Admin > App features.
  Both save `disabledFeatures` in that company's settings (`saveDisabledFeatures`). A new
  member feature needs a key in both lists so it can be switched off. The BridgeX module
  tick-list page was removed; modules are still set from the industry when a company is made.
- A service call is open → accepted → done (`serviceCalls` setting; one change at a time via
  `changeServiceCalls`). Until someone accepts, every staff screen vibrates and beeps
  (components/ServiceCallAlert.tsx, in RebornLayout) and an urgent push is re-sent every 45 s
  (`remindServiceCalls`, up to 20 times). A manager or the main admin can assign a person: only
  that person is alerted and only they (or a manager) can accept. Texts for it live in
  i18n/home.ts (always loaded), not the staff bundle.
- Table QR codes (Admin > QR codes) cover the tables in the booking areas plus extra tables
  the admin adds by number (`extraTables` setting, e.g. `21-30` or `A1, A2`); each can be
  printed on its own. A table QR is valid for any label signed with `tableSig`.
  The QR codes tab (tables + staff check-in QR) is for the main admin and managers; replacing the
  staff code stays main-admin only.
- Call service (`service` feature): a member seated at a table (venue check-in with a table)
  calls staff; open calls live in the company's `serviceCalls` setting and show on the POS
  tables screen until Done.
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

- How a service is booked is set per booking area (Admin > Settings > booking areas): with
  tables listed the customer picks a table/room; with none it is an appointment by date and
  time; `place: "customer"` is a service at the customer's address — no table, and the
  address is required (app, staff booking and the chat bot) and saved in
  `appointments.service_address`. Use `atCustomerPlace()` / `serviceAddressFrom()` (server/booking.ts).

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
- Language in the chat: a named language switches **at once, no asking** — "change chinese" / "switch to
  english" / "换中文" / "ganti bahasa indonesia" (`parseLangSwitch`; saved on the contact and the app account).
  A request with no language named — "change language" / "language" / "ganti bahasa" / "换语言" (`wantsLangMenu`)
  — gets one trilingual question with English / 中文 / Bahasa Indonesia buttons (`LANG_ASK_TRILINGUAL`, flow
  `langPick`); the button, 1 / 2 / 3 or the name then switches. Any other message clears the question.
- Questions the bot learns (Admin › FAQ): a message with no FAQ match is saved by `createPendingFaq` as an
  inactive, answer-less FAQ item and shown at the top of Admin › FAQ ("waiting for an answer"); the member
  gets the "we'll get back to you shortly" hand-off. When the admin types the answer and saves, the item
  switches on by itself (PUT `/api/reborn/admin/faq/:id`), and the bot answers the same question — also in
  other words, `faqSimilar` (filler words dropped, light stemming, Chinese by character pairs) — with it,
  on WhatsApp / Messenger / Instagram / Telegram. Items without an answer never match, and a question
  already waiting isn't saved twice.
- A song is only searched after the member chooses menu option **2 Request a song** (the number 2, the
  `menu_song` button, or the label typed as is — "request a song" / 点歌 / "minta lagu"; `parseMenuIntent`).
  A sentence that merely mentions a song ("what songs do you have?", "I want to sing") is not a request.
  After the member chose it (and "scan your table QR first"), the next message (30 min) is taken as the
  song name (`songWait`). Any other message — even one that happens to equal a library song title
  ("What you sell") — is not guessed to be a song: no FAQ match → the "we'll get back to you
  shortly" hand-off above.

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
- Toasts never show the HTTP code: `toast()` (hooks/use-toast.ts) strips the "400: " that `apiRequest` puts in
  front of a server message, in the title and the description, on every page.
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
- **Reset all numbers** (main admin only; button in Admin › Users and in Admin › Settings › Main-admin
  security — `components/ResetNumbers.tsx`, an in-app box, never `prompt()`): `POST /api/reborn/admin/reset-numbers`
  with the main-admin password sets to 0 every member's tokens / points / credits / KGOLD / referral earnings, the
  spin prize pool and the stock count of every inventory item (`pos_products.stock` + the BridgeX module's
  `bridge_stock_levels`). Users and items are kept; levels also start again (gift levels count only gifts after `giftLevelsSince`, game rank stars and `users.level` go to the start) and kept bottles are cleared (`bottle_keeps` kept → expired, quantity 0); each stock change is written to `stock_movements` /
  `bridge_stock_movements` (reason `adjustment`) in the same transaction. Not reset: sales history, accounting,
  bottles, packages, game ranks.

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
  the first song of `fairSongQueue`; the singer gets "you're on now" (in-app + phone push only, no WhatsApp) and the next one "you're up next". Only tonight's
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

## Pet care room (client/src/pages/reborn-pet.tsx `PetRoom`)

- The pet is alive in its room: it wanders and, by mood (`petMood`: happy / ok / sad from the four stats),
  dances, spins, waves, stretches and hops (happy), or just sits and looks around, slower and drooping with a
  tear (sad). Poses are in `POSES` / `useWander`; every new move needs a `.rwpet-m-<pose>` rule in `WALK_CSS`.
- Every care action that worked (`PetCard.doAction` → `careFx`) plays a reaction in the room (`FX_MS`, `fxParts`):
  feed = food drops in + chomping, clean = soap + bubbles + shake + sparkles, play = ball + hops, sleep = yawn +
  💤, wake = stretch. Tapping the pet gives a random reaction + a line (free); tapping the floor makes it run
  over (`callPet`); the 6th tap in a row makes it extra happy.
- No energy (awake, energy 0): Feed / Play / Clean aren't sent to the server; the pet yawns and asks for a nap
  (`hm.pet.say.tooTired`), a friendly "😴 No energy" toast says to tap Sleep, the other buttons dim and Sleep
  pulses (`rwpet-nap`).
- It talks in a speech bubble that follows it (`say`, texts `hm.pet.say.*`, first person so a company's own pet
  name still works): greets on opening, asks for what it needs (hungry / bored / dirty / sleepy), thanks after
  care, chats every ~17 s, and drops tips (floor tap, light switch, "feed me N times a day to earn a token").
  New lines need en / zh / id. The room also shows a mood chip (Happy / Calm / Needs love).
- The walking pet is a cartoon puppet, not a flat picture (client/src/components/PetRig.tsx): the dressed pet
  (`figureSpec` — the same layers as the still `DoluruuFigure`) is flattened into one texture and drawn on a
  bendable WebGL mesh. Head, legs, arms, tail and body move on their own from the eye landmarks (`eyes` of each
  outfit / `PLAIN_PET`): steps with lifted feet, arm swings, head tilts, squash & stretch, a wagging tail,
  breathing, and blinking eyes (closed while asleep). Poses are springs (`target()` per `RigPose`); turning
  around is an instant flip (never squeezed paper-thin). Sleep dimming / sick grey are done in the shader, not
  with CSS filters. No WebGL → `onFail` falls back to the still picture. The page's phone rule shrinks every
  `canvas` (index.css) — the puppet's canvas overrides it (`.rwpet-rig`).
- Animations only use transform / opacity and are switched off with `prefers-reduced-motion`.
- Outfits (Costumes › Clothing): five RWG looks — Streetwear Hoodie, Traditional Chinese Outfit, Basketball
  Look, Winter Cozy Outfit, Fantasy Adventurer (`OUTFIT_LIST` in server/petHome.ts, ids `o1`–`o5`, pictures
  client/public/pet-items/outfit-N.webp). Each is a complete look with its own shoes / hat, cut from the RWG
  outfit sheet with BiRefNet, on the shared 300×360 canvas: eyes 82 px apart, feet on the floor at y 357,
  centred; the eye anchors (`eyes`) are stored per outfit, so hats / glasses / neck items and the puppet still
  line up. A new outfit must keep that canvas and store its own measured eyes. The old clothing sheet
  (`c2`–`c30`, cut off at the sheet edges) is off sale: `refundRemovedWearables` gives owners their pet coins
  back once per company's data space (only while they still own it, so two servers never refund twice) and
  takes it off their pets. `cloth-1.webp` stays as the shirtless base layer.
- Only full costumes are sold: hats, glasses, neck items (`w*`) and footwear (`s*`) are hidden and refunded the
  same way, and the Costumes tab shows no slot chips (`WEAR_SLOTS` = clothing only).
- Shop taps are confirmed in an in-app box (`PetShop` `ask`, portal to body; never `window.confirm`): buying
  ("Buy X? It costs 🐾 N, you have 🐾 M"), then "Wear it now?" for a costume or "Put it in the room?" for
  furniture; tapping an owned costume asks "Wear X?" / "Take off X?", owned furniture "Put X in the room?"
  (says it replaces what's there) / "Take X out of the room?". Texts `hm.shop.*`.

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
- Reaching the limit exactly is fine. Any card can be played with one tap — nothing is blocked or
  confirmed (never `window.confirm`: phone browsers block it); a player whose card takes the total OVER the limit BLASTS (`unoBust`): drinks 1 cup
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
- Every gift has a full-screen scene (`sceneOf` never returns null): besides the big ones above, Rose 🌹
  (blooms, petals fall), Heart ❤️ (beats, love waves), drinks 🍻 (two glasses clink, "Cheers!" `vn.kos.cheers`),
  cake 🎂 (drops on the table, balloons + confetti), teddy / cuddly 🧸 (bounces in), money 💰 (bag + coin
  fountain + bill rain) and the gift box 🎁 for anything else (opens, the gift's own picture rises). Picked by the
  gift's animation, else its emoji / name; admin Settings lists them as animations. The sender sees the same
  scene after sending ("You sent X a Y", `vn.kos.youSentTo`, KGOLD shown as −cost). Reduced motion → the
  simple pop.
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
- A visits package can be a package of items ("6 beers — choose which"): in the package form the admin ticks the items it can be redeemed for
  (`pos_products.package_item_ids`, copied to `member_packages.item_ids` when sold). "Use 1" then asks which item (POS pay panel and Packages tab,
  `UsePackageButton`); it needs the member's open bill, adds that item at RP 0 (`appendItems`, so it comes off that item's stock and writes a
  stock movement) and takes one use. A sold-out item can't be chosen. No item ticked = a plain visit as before.
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

## LED lights (Admin › Lights)

- `components/LightsPanel.tsx` + `lib/lights/`: the main admin controls Bluetooth LED lights — power, colour wheel,
  brightness, six quick + six saved colours (browser storage), five app-driven movements (rainbow, breathe, flash,
  chase, twinkle; `effects.ts`) and the lights' own built-in effects. Targets: all, a group, or ticked lights.
- Connection: Web Bluetooth only (Chrome on Android / desktop). It does NOT work in the installed Android app
  (a `react-native-webview`) or on iPhone. Each light is picked once per visit in the browser's chooser; its command
  style is chosen from the services it offers and the name it advertises (`protocols.ts` `chooseProfile`). Styles:
  `elk1/elk2/elk3` (ELK-BLEDOM family — what the duoCo and LED LAMP apps drive; service FFF0/FFF3; style 1 is
  byte-for-byte what the duoCo app was seen sending), `ledble` + `ledDash` (FFE0/FFE1), `triones` (FFD5/FFD9). The
  layouts differ by firmware, so every light row has a command-style select and a Test button (flashes red, green,
  blue). Sources are in the file header (a sniffed-traffic write-up and the community `elkbledom` integration); none
  of it has been run against real lights by us. A light of another family is reported by name.
- Music (Music tab): the ELK-family controllers have their own microphone; `playMusic` switches it on (8 modes +
  sensitivity), so the lights keep following the music with no phone connection and it reaches every light.
  Any colour / effect / power command sends "stop listening" first (`leaveMusic`).
- A Bluetooth adapter holds only a few connections at once (about 6 on a phone, the "max 8" of other LED apps; a
  computer's adapter may manage more — the "Connections at once" select, `maxLive`, lets the admin raise it):
  `LightHub` keeps at most that many open, closes the least recently used and walks through the rest in turns, so a
  colour reaches 60+ lights in about a minute, not at the same instant; an app-driven movement only runs on that many
  lights at a time, built-in effects and music reach all. Flash speed is capped at 3 per second (photosensitivity).
- The hub talks to lights through `LightLink` (`hub.ts`); a gateway box near the lights (ESP32 / Raspberry Pi holding
  the connections, the app sending over Wi-Fi) is the planned way to move every light at once — it only needs a new
  `LightLink`, not a new screen. There are no demo lights.
- Tests: `client/src/lib/lights/lights.test.ts` (run by `npm test`). In this app's CSS, `grid-cols-1..4` become one
  column on phones and every `button` gets 16px side padding (use flex / `p-0` for icon buttons).

## Security (Admin › Security)

- Tab for staff, managers and the main admin (`components/SecurityPanel.tsx`, sub-tabs Officer check | Cameras; routes
  `server/security.ts`, rules `server/securityLogic.ts`, settings `securitySetup` + `officerLog` in `appSettings`, per company).
- **Officer at the door**: staff start a check when someone says they are police / an official (name, badge, unit); the
  managers get a WhatsApp (`alertPhones`, else the company admins) and staff follow a checklist (official ID, written
  assignment letter, call the station's OWN number from `stationNumbers`, hand nothing over without paper); the end (verified /
  not verified / left or refused) is logged (last 200) and alerted too. Deliberately NOT built: spotting police by face or
  car plate, or telling customers police are around — a check is paper + a call, not a camera.
- **Cameras**: stream addresses (picture = MJPEG / snapshot refreshed every N s, or a page in a frame), http(s) only. Cameras
  with RTSP need the free go2rtc on a venue PC to give a browser-playable address; a browser blocks plain http on the https page
  unless it is localhost (`isBlockedByBrowser`). Viewing is for staff; editing, station numbers and alert numbers are main-admin.
  No face or plate recognition, no motion alerts yet (would need a gateway program on the venue PC).

## TV screens (Admin › Lights & TV › TV)

- The admin tab is "Lights & TV" (`components/LightsTvPanel.tsx`, sub-tabs Lights | TV). Each TV (up to 12) is a name, a view and
  the tables it follows (`appSettings` key `tvSetup`, rules in `server/tvLogic.ts`, routes in `server/tvDisplay.ts`). A TV's
  address is `/tv/<secret token>` (`pages/tv-display.tsx`, no login — the token is the key; page data is first names, song
  titles and table labels only). Views: `overlay` (transparent: moving "now singing / next" bar across the top + gift scenes),
  `queue` board, `gifts` wall, `off`. Same view + same tables = same picture; different view or tables = a different picture.
- Tables: empty list = every table. A song shows on a TV by its table; a gift shows on a TV that follows the sender's or the
  receiver's table. "Table 5" / "5" / "meja 5" / "5桌" are the same table (`tableKey`).
- Live: the page opens an SSE stream (`/api/tv/:token/stream`: `ready`, `refresh` when songs / queue change, `gift`) and
  re-reads `/api/tv/:token/state`; a 30 s safety refresh covers a dropped stream. A KOS gift (`POST /api/reborn/kos/gift`) calls
  `publishTvGift` after the gift is saved (never blocks the sender); the page queues gifts and plays each ~9 s with the app's own
  `GiftScene`, then returns to the bar. Recent gifts are kept in memory only (20 per company).
- A TV address carries `?tenant=<slug>` on the shared platform host (`rememberedTenantSlug` sets the cookie before the page loads data), so every company's TVs work.
- Showing it over the karaoke picture: the karaoke program's video is not ours, so the overlay address is added as a see-through
  browser layer in front of it (OBS Browser Source, or an HDMI-capture mini PC). Remote power / input / volume of a TV is not
  built; it would need a gateway box like the lights one.

## BridgeXPOS homepage (client/public/bridgexpos-home)

- On the BridgeX host, `/` and `/bridgexpos` serve this standalone page (server/vite.ts; its own
  address + share picture are rewritten to the host that was opened) to a
  visitor who is not signed in and not inside a company; everyone else gets the app as before
  (the React `bridgex-landing.tsx` is still what the app itself shows on in-app navigation).
- Plain HTML + site.css + site.js (Three.js from a CDN): the glass logo is built in code
  (`createLogo`), and each `<section class="page">` sets where the logo stands through its
  `data-side / data-y / data-scale / data-turn / data-spread / data-hue / data-tint / data-dim`.
  One wheel / key gesture moves one page (`wirePageStepping`): every wheel event of a trackpad flick,
  inertia included, counts as one gesture, and a page taller than the screen is read to its end first —
  the next gesture turns the page. A new section becomes a page by itself. Touch works the same way
  (native touch scrolling is off, `touch-action: none`): the page follows the finger inside a tall page,
  a swipe from its edge turns it. A page turn has two parts (`goToPage`): the page's texts twist away
  (`.is-leaving`, ~0.5 s), then the screen glides on and the next page's texts twist in (`.is-visible`).
- Files load from `/bridgexpos-home/…` (never `/assets`, which is the app's hashed build folder).
- The WhatsApp number of every button is `WHATSAPP_NUMBER` at the top of site.js.
- Demo video (the page after the title): `assets/demo.mp4` (720p, CRF 26, AAC 96k, faststart) with
  `assets/demo-poster.jpg`; it loads only when played and pauses when its page is left. It is built in
  `~/videos/bridgexpos-demo` (HyperFrames: `scenes.json` + `node build.mjs`, voice-over in English).
- Three languages: index.html is written in English and `i18n.js` holds the 中文 and Bahasa
  Indonesia of every text, keyed by the English wording (texts, `alt`, `aria-label`, the WhatsApp
  messages, title + description). A text changed or added in index.html needs its entry there, or it
  stays English. The picker saves to `localStorage.language` — the key the app reads — so the login
  page opens in the same language.
- Icon + share picture: `assets/favicon.svg` and `assets/share-card.svg` are the sources; the PNG / JPG
  files beside them are rendered from those with sharp (1200×630 for the share card). The app's own
  BridgeX pages (login, apply, console) use the same icon and share picture (server/pageBrand.ts
  `BRIDGEX_BRAND`). WhatsApp keeps an old link preview for a while after a change.

## Phone layout rules for new buttons and popups

- index.css has phone-wide rules (button min-height 44px + padding, svg height auto). Icon-only buttons
  (a button whose only child is an svg) and svgs with a `w-`/`h-` class are exempt, so write icon buttons as
  `<button className="w-9 h-9 ..."><Icon className="w-4 h-4" /></button>`. A popup portaled to `<body>` sits
  outside `.rwg-app`: give its root `text-white` (text colour is not inherited from the app) and check it on a
  phone-size screen before shipping.

## Find nearby cameras / TVs (Security + TV tabs)

- The cloud server cannot see a venue's network, so `client/public/venue-scan.mjs` (plain Node 18, no packages) runs on
  one PC at the venue: ONVIF WS-Discovery + UPnP/SSDP (TVs) + a port 554 check of the local /24 (cameras without ONVIF).
  It polls `/api/venue-bridge/poll` every 15 s and scans when the admin presses "Find nearby" (or at start), then posts
  `/api/venue-bridge/report`. Auth: the per-company token in `appSettings.venueBridgeToken` (header `x-bridge-token`,
  plus `x-tenant-slug` for a company on the shared host). Server: server/venueScan.ts; panel: components/NearbyDevices.tsx.
- It never logs in to a device. A found camera is added with its web page as the address (the rtsp address is listed
  for a stream converter such as go2rtc); a found TV is added as a TV screen name. Remote TV power / volume is not built.

## Realistic gift effects (clips)

- A gift effect can be a rendered clip instead of the drawn scene: `FX_CLIPS` in pages/reborn-kos.tsx maps a scene to
  `public/gift-fx/<scene>` (`.mp4` on black for the app, blended with `mix-blend-mode: screen`; `.webm` with real
  transparency for the TV overlay, so the karaoke screen shows through). A scene without a clip keeps its drawn version.
- Make a clip: generate it on a pure black background (Higgsfield `seedance_2_0_mini`, 720p, ~4 credits for 4 s), then
  ffmpeg: mp4 = `scale=960:540 -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart -an`; webm = luma-to-alpha
  (`geq` with a = max(r,g,b), colours un-premultiplied) `-c:v libvpx-vp9 -pix_fmt yuva420p -crf 38 -auto-alt-ref 0`.

## Reset and inventory import

- "Reset all numbers" (main admin) also clears everything still waiting: song requests (`clearSongQueue`), prizes to redeem
  (`spin_results` unused/redeeming → cancelled) and open POS bills (→ cancelled). A new venue day (8am) and "Close POS day"
  also clear the song queue (`ensureVenueSession`).
- Admin › Inventory › "Fill inventory from Excel" (components/InventoryImport.tsx): the browser reads an .xlsx
  (`read-excel-file`, fetched only on use) or .csv, columns found by their titles (Name, Category, Price, Cost, Stock, Supplier — in
  English / 中文 / Indonesian); `POST /api/reborn/admin/inventory/import` (server/inventoryImport.ts cleans the rows) matches items
  by name: new = created, existing = updated, and a stock figure becomes the new count (the difference is a stock movement).
  The reading is in shared/inventorySheet.ts (header row found anywhere in the first 15 rows, columns matched by title words with typos
  tolerated, volume added to the name, category guessed from the name, optional "cost is the total for the quantity").

## Industries per company

- A company's industries are only what its BridgeX admin sets (BridgeX › App functions › "Industries of …", one per line;
  `appSettings.industries` in the company's data via `/api/v1/platform/companies/:id/industries`, helpers `companyIndustries()` /
  `saveCompanyIndustries()` in server/rebornGame.ts, list cleaning in shared/industries.ts). Until saved: Reborn = Lounge, Beauty,
  KTV Room, KTV VIP, Restaurant, Game House; another company = the one industry it was set up with. `GET /api/reborn/industries` answers with
  that list and every industry filter / picker (Products, Inventory, orders, staff leaderboard) uses it — nothing derived from item data.
- The Excel import lives in Admin › Products (components/InventoryImport.tsx): the admin can tick the industries for the imported items
  (with a single industry they all go to it).

## Ask suppliers when stock is low (Admin › Inventory)

- Off by default (`appSettings.supplierReorder`: on/off, message language, and the ticked items each with a "low at" level and an
  order quantity). Every 30 min, per company (`runSupplierReorderCheck`), a ticked item at/below its level whose supplier has a phone
  number gets a drafted WhatsApp message — one per supplier number, listing all their low items. The draft waits as a request
  (`supplierReorderRequests`); the admin gets a WhatsApp notice, reads/edits it in the panel and presses Send (`waDigits` → `sendWhatsApp`).
  Nothing is ever sent without that tap. Same item isn't asked again while a request waits, 3 days after sending, 1 day after dismissing.
- The text is written by Claude (haiku) when `ANTHROPIC_API_KEY` is set on the server, else a ready-made template in en / zh / id
  (server/supplierReorderLogic.ts `templateMessage`). Supplier phone is a column in Admin › Products.

## Sold by the pack (Admin › Products)

- A product can have `units_per_pack` (e.g. 24 cans) and `pack_price` = what a whole pack COSTS (bought). The cost of one unit (`cost`) is
  always `pack_price ÷ units_per_pack` (shared/packPricing.ts, set on the server in `packPricingFields` for create and edit, shown read-only in
  the forms); the selling price (`price`) is never touched. Stock stays counted in units. Inventory shows "= N pack + M" with a ±pack
  button; the POS tile gets a "Pack ×24" button that adds a whole pack of units at the unit selling price. Not the same as the member
  "packages" (visits / credit).

## Same item from several suppliers (oldest stock first)

- Every delivery is a row in `stock_movements` (supplier + unit cost); server/fifo.ts works out the layers still on the shelf from that
  history (sales / losses use the oldest first, returns go back at the cost they came out at, stock from before the history is an
  "opening" layer at the item's own cost/supplier). Used for: Inventory unit cost + stock value, the cost of sales in the daily POS close
  report (`fifoSaleCosts`), and "Stock by supplier and price" under each product (`/api/reborn/admin/pos/products/:id/layers`).
- A second supplier = "Duplicate for another supplier" (copy icon in Products; no stock, no supplier) → change supplier name / number /
  cost, then, if the POS should show one item, "Same item as…" merges it into the first (stock, delivery prices, bills move over).
  The Excel import has "new deliveries — add to stock" for the same item arriving from another supplier. Two items with the same name
  are matched ambiguously by the Excel import (the later one wins) — merge them first.

## Stock numbers: added in Products, read-only in Inventory

- Stock is added in Admin › Products › Restock: item, supplier, quantity, unit cost and the **delivery date & time** (`receivedAt`, default now; `POST /api/reborn/pos/stock-in`
  refuses a future time or one older than a year). The movement in `stock_movements` and the `purchase` expense carry that time as `created_at`, so the oldest-first (FIFO) layers follow
  the real delivery order. Admin › Inventory shows the numbers only (no + / − / typed count / Save bar); there it sets bundles, packages and sell options. Corrections still go through
  stock-in with a negative quantity, the Excel import or the receipt scan; the old `POST /api/reborn/admin/inventory/counts` route stays on the server but has no screen.
- A spilled / broken item on an open bill: POS bill › **Lost** on the line (`POST /api/reborn/pos/items/:id/lose`, status `lost`): leaves the bill total, keeps the stock gone (cancel / refund do not
  give it back), and books a `loss` expense at cost (`refType pos_loss`). Removing an item updates the bill at once without a refresh.

## LED lights inside the phone app

- Web Bluetooth does not exist in the app's web view, so the app (mobile/) carries a native bridge: `mobile/bleShim.ts` is injected before
  every page and defines `navigator.bluetooth` (a chooser where several lights are ticked at once (`requestDevices`, also "Select all"; `requestDevice` takes one), connect, services, write, disconnect) on top of
  `ReactNativeWebView.postMessage`; `mobile/ble.ts` answers those calls with `react-native-ble-plx` (permissions, scan 6 s, connect,
  write). The website's lights code (client/src/lib/lights) is unchanged. It needs a NEW native build of the app
  (`npx eas-cli build --platform android --profile preview`, then install it) — an old build shows "install the latest app" on the Lights tab.
  Test the shim: `npx tsx --test mobile/bleShim.test.ts`. Not yet run on a real phone with real lights.

## Wi-Fi scan inside the phone app (CCTV + TV)

- Android only: `mobile/modules/lan-scan` is a small local Expo native module (Kotlin, `LanScanModule.kt`) doing what the PC scanner does — ONVIF
  WS-Discovery, UPnP/SSDP (TVs) and a port-554 check of the phone's /24 — with a multicast lock held; `mobile/lanScan.ts` calls it and
  `bleShim.ts` exposes it to the page as `window.__rebornLanScan()`. Admin › Security / TV › "Find nearby" shows "Scan with this phone" when that
  exists and posts the result to `POST /api/reborn/security/nearby/found` (staff). The app also allows plain-http calls (`expo-build-properties`
  `usesCleartextTraffic`) and `mixedContentMode="always"` so http camera pictures show inside the app. Needs a NEW app build; iPhone has no scan.
  The Kotlin has not been compiled or run on a phone yet — if the EAS build fails, read the Gradle error and fix `LanScanModule.kt`.

## Who sees which admin buttons (tabs)

- The tab lists per kind of account live in shared/adminTabs.ts (`STAFF_TABS`, `MANAGER_TABS` — which now also has Users, Products and Inventory —
  and `ADMIN_TABS`). The main admin can narrow what one person sees: Admin › Users › a staff / manager / admin row › "Which buttons can they see?"
  (`appSettings.tabAccess` = userId → tabs, `PUT /api/reborn/admin/tab-access/:userId`, read by the person through `/api/reborn/my-tabs`;
  `useMyTabs` in reborn-admin.tsx). It can only hide tabs the person's kind of account already has; Overview always stays; nobody can limit their
  own access. This hides buttons — the server routes still decide by role (`requireStaff` / `requireManager` / `requireAdmin`), so a hidden tab is
  not a security wall.
- A manager can see Users (list only), and can add and edit products, change the stock counts (save + confirm + log), import from Excel, copy an item for
  another supplier and change pictures (`PATCH /api/reborn/admin/pos/products/:id`, `/inventory/counts`, `/inventory/import`, `/layers`, `/duplicate` are
  `requireManager`; `useProductRights()` in hooks/useAdminRole.ts). Deleting a product is also allowed for a manager (an item that was sold before is archived — `pos_products.archived`, gone from every list and the POS, past bills keep it); deleting a person, merging items, the supplier-message panel and
  everything else in Settings stay with the main admin.

## Rating staff (Support › Rate staff)

- A member picks a person of the team (owner / admin / manager / staff, not themselves), gives 1–5 stars and an optional comment:
  `GET /api/reborn/support/staff` (list with average, review count, the member's own rating), `POST /api/reborn/support/rate-staff`. One rating per
  member per person (rating again replaces it). It is saved in `bridge_staff_reviews` (what the staff leaderboard averages: ⭐ + review count, red flag
  on low ratings) and in `bridge_feedback` (Admin › Feedback).

## Items with no stock, staff deposit, employment contracts

- An item with no stock (`stock <= 0`, not a package, and the `allowNegativeStock` setting off) is left out of the POS picker for tables and
  staff orders (`soldOut` on `/api/reborn/pos/products`; `ProductPicker` skips it) and out of the member order page
  (`/api/reborn/shop/products` no longer lists it). Admin lists and the POS Stock tab still show it. Turning on "allow negative stock" shows it again.
- Payroll › each staff row has a **Deposit held** amount and a **note** (`bridge_staff_profiles.deposit` / `deposit_note`); it is kept on
  the profile and printed as a clause in the contract: it covers the first month (a penalty then comes out of it), and from the second month a
  penalty is deducted from the salary. Each payroll row has a **Deduction this month** amount + reason: the staff member's net pay is reduced
  by it, the `salary` expense booked is gross − deduction (statutory contributions stay on the gross), and the reason is in the ledger note and admin log.
  The deposit itself is only a record (nothing is taken from it automatically).
- Employment contract (server/staffContracts.ts, shared/staffContract.ts, server/contractPdf.ts; table `staff_contracts`): staff (users with
  role staff/admin) upload their ID photo in the app (Profile › My employment, `/employment`; shrunk in the browser, stored as a data URL in
  the company's own database — never in the public uploads folder — and only returned to the person and to an admin). In Admin › Payroll › a staff row
  › "Employment contract & ID" the main admin sees the ID, sets the role (job title), start date, language (en / 中文 / id) and extra terms and
  sends the letter (`send`; wording built from the payroll profile: salary or hourly pay, commission, deposit). The staff member reads it, types
  their name and draws a signature (`sign`, needs the ID uploaded) → "Signed — approve it" → the admin approves (`approve`) or sends it back
  with a note (`return`). Approving writes the PDF (pdfkit; Chinese needs a CJK font — the Dockerfile installs fonts-wqy-zenhei, or set
  `CONTRACT_CJK_FONT`; without one the PDF is written in English) and e-mails it to the staff member's email and to the approving admin's email
  (`sendEmailDetailed` with an attachment; needs `RESEND_API_KEY` or `SENDGRID_API_KEY`). A staff member without an email (phone login) only gets the
  in-app download. The wording is a general template — a company should have it checked for its country.

- Contract add-ons: the admin types the **job scope** (duties, one per line) in Payroll › Contract; with `ANTHROPIC_API_KEY` the AI (haiku) tidies it into a "Job scope" clause in the contract's language
  (`dutiesFrom`, never adds duties or figures; no key = the admin's own lines). The admin can also **upload the ID for a staff member** who can't
  (`POST /api/reborn/admin/contracts/:userId/id`, photo shrunk in the browser).

## Clearing the accounting and starting from the imported stock

- `scripts/reset-accounting.mts` (run on the server, `DATABASE_URL=… npx tsx scripts/reset-accounting.mts`, dry run unless `--apply`; `--schema tenant_<id>`
  for another company, `--since YYYY-MM-DD`, `--decimals 2` for SGD): writes every old `ledger_entries` row to `accounting-backup-<time>.json`, deletes them,
  and adds one `purchase` expense per Excel-import delivery in `stock_movements` (quantity × unit cost, `server/accountingReset.ts`). Products, stock,
  POS bills / sales history, members and payroll settings are not touched. The Excel import itself books no money. Tested on a scratch Postgres only.
- The same in the app: Admin › Accounting › **Start the accounting again from the inventory** (main admin, `AccountingFresh`,
  `GET /api/reborn/admin/accounting/reset-preview`, `POST …/reset` with `{confirm: true}`). In one transaction it copies every
  `ledger_entries` row into `accounting_backups` (made on first use per data space; download `GET …/backups/:id`), deletes them, and
  books one `purchase` per stock delivery of this company (`stock_movements` reason `stock_in`, delta > 0: quantity × its unit cost,
  else the item's cost; none → skipped; note says Excel import / the receipt it came from, `deliverySource`).
- **Scan a supplier receipt** (Admin › Inventory for anyone who edits items, and Admin › Accounting; `ReceiptScan`): the photo goes to
  `POST /api/reborn/admin/inventory/receipt/read` → Claude (`server/receiptAi.ts`, Anthropic SDK, structured output, needs
  `ANTHROPIC_API_KEY`; without it the admin types the lines) reads supplier, phone, invoice no., date, total and every goods line, and
  picks the matching inventory item (`matchProduct` in server/receiptLogic.ts: the AI's pick if it names a real item, else the closest
  name). The admin checks / changes lines (existing item or "new item"), confirms, and `…/receipt/save` in one transaction adds the
  stock (`stock_movements` note "Receipt INV from Supplier (date)"), updates the item's cost + supplier, creates new items hidden from
  the POS (`pos_visible` false, price 0) and books ONE `purchase` expense (refType `receipt`) with the receipt photo.
- The contract's role is picked from the company's jobs (`bridge_positions`, "Other job" lets the admin type one). The duties of each job are saved once
  (`appSettings.jobScopes`, positionId → text, `PUT /api/reborn/admin/job-scopes/:positionId`) and fill the job-scope box for everyone given that job.

## Payslips + payday reminder (Admin › Payroll)

- "Record paid" saves a payslip (`payslips`, one per person per month, JSON snapshot: basic / commission / overtime, gross, the staff's contributions, the
  deduction + reason, net pay; server/payslips.ts, words in shared/payslip.ts). The staff member gets a notification and an e-mailed PDF (when they have an email) and
  reads / downloads it in the app (Profile › My employment › My payslips, `/api/reborn/my-payslips`); the admin downloads it from the payroll row
  (`/api/reborn/admin/payslips/:userId/:month/pdf`). The PDF is in the staff member's language (Chinese needs the CJK font like the contract; else English).
  Recording a month again replaces its payslip. A payslip never shows the employer's share.
- Payday reminder: the day is Admin › Settings › Payroll day (default 15). Hourly per company (`runPayrollReminder`): from 09:00 WIB on that day (or later in the
  month if the server missed it) the main admins get one notification "N staff still need to be paid for <last month>" (marker `payrollRemindedFor`); nothing is
  paid automatically. The month to pay is the one that just ended; Payroll opens on the current month, so pick the previous month with the month box.

## Schedule (Admin › Staff, main admin + managers)

- Admin › Staff › Schedule: tap the people, tick the days on a month calendar (`components/MultiDateCalendar.tsx`, several dates at once, past days off), set the hours
  and press "Add N shifts" — one `worker_shifts` row per person per ticked day (`POST /api/reborn/admin/shifts` with `userIds[]` + `dates[]`, up to 300 at once; a shift
  that already exists is skipped). Each person gets one notification listing their dates. Managers get this view (the staff-list, shifts routes are `requireManager`); attendance
  review, leave approval and the QR stay with the main admin. Accounts removed with their records kept (name "Removed user", no email) are left out of the Users list.

- Support › Rate staff list: the main admin can take people off it (e.g. shareholders): Admin › Users › a staff / admin row › untick "Show this person in Support › Rate staff"
  (`appSettings.ratingHidden` = user ids, `PUT /api/reborn/admin/rating-hidden/:userId`). A hidden person isn't listed and can't be rated (the rate call is refused too).

- Staff real name: Admin › Users › a staff / admin row › "Real name" (`bridge_staff_profiles.real_name`, `PUT /api/reborn/admin/staff-real-name/:userId`). When set it replaces the
  account name in Support › Rate staff, the staff leaderboard, the schedule picker + schedule, attendance, leave, payroll, contracts and payslips (`realNamesOf`).

## POS offline mode (Quick sale)

- The POS opens and sells with no internet. `client/public/sw.js` keeps the app shell, the built files (`/assets`) and the few GET answers the POS reads (who is signed in, role,
  `/pos/products|staff|settings|stock|orders`; saved 24 h; member lookups are never saved) and answers from them when the network is down; writes are never answered from it.
  The POS page registers the worker and hands it the files it already loaded (`prepareOfflinePos`), so the POS has to be opened once while online on each device.
  Queries and mutations run with `networkMode: "always"` for this. Logging out removes the saved answers (`forgetOfflineData`).
- Quick sale tab only: with no answer from the server the sale is saved in the browser (`rw.pos.offlineSales`, rules in shared/offlineSale.ts, `submitSale` / `syncOfflineSales` in
  lib/offline-sales.ts) with its own `offlineId` and the time the customer paid, a receipt is printed from the screen's numbers, and the queue is sent in order when the internet
  returns (online event, every 30 s, Send now). `POST /api/reborn/pos/sale` books it at that time (`pos_tickets.offline_id` unique per company: a repeat is answered "already sent",
  never a second sale; stock isn't refused afterwards; ledger entry dated the sale). A sale the server refuses stays in the list (red box) with Try again / Delete. Offline: cash + card only —
  tables / open bills, member lookup, RP credits and packages need the internet (the table screens show the last saved copy only).

- The whole app opens offline for reading: the service worker also keeps the last answer of every app read (GET `/api/*`, JSON up to 1.5 MB, 3 days, newest 300) except the
  `NEVER_KEEP` list in sw.js (sign-in, streams, member look-ups, chats / CRM, contracts / ID / payslips, files, codes). An answer from that copy carries the header `x-sw-saved`;
  the client (`reportNetwork` in lib/offline-sales.ts, called by apiRequest / getQueryFn) then shows the "no internet — showing saved information" notice in RebornLayout. A change made
  offline fails with `srv.err.offline` ("changes need the internet") — only the POS Quick sale is queued and sent later. Every page registers the worker and hands it the files it loaded.
- Recommended items: `pos_products.recommended` (Admin › Products: ⭐ beside the name, tick box on the phone card and in the add form). Shown first under "⭐ Recommended" and with a star
  in the POS item picker and the member order page.

- Packages sit near the top: in the POS item picker and the member order page the groups are ⭐ Recommended, then 📦 Packages (every item with a package kind; not repeated in its category), then the
  categories. The member list says what a package holds ("6 uses: Bintang Beer · valid 30 days", `packageItems` from `package_item_ids`). To sell "6 of one item" create a Visits package with 6 uses and
  that item ticked; a second package on the same item (12 uses, another price) is just another product.

- Bundles ("6 beers in one go", not a member package): a normal product with `bundle_item_id` + `bundle_qty` (Admin › Products › 📦 box › "Bundle"). It has its own price and shows in the POS / member
  order lists like any item (stock shown = whole bundles the item can still make, `withBundleStock`); selling one takes `bundle_qty` off the item's stock (`moveStock`: sale / reject / edit / remove / cancel /
  refund all go through it, stock movement written on the item with the bundle's name). Several bundles of one item are just several products. A bundle is left out of Inventory and supplier-reorder lists.
- Bundles and packages are made on the inventory item: Admin › Inventory › pencil on an item › "🍺 Bundles & packages of this item" (components/ItemBundles.tsx) lists the item's bundles and visits packages
  (edit name / price / ⭐, delete) and adds new ones (bundle: units + price; package: uses + valid days + price, the item pre-ticked). One item can have many; each is tied to that one item's stock.
- The contract form is a draft: while the contract is not yet sent it is saved ~0.8 s after each change (`POST /api/reborn/admin/contracts/:userId/draft`, in the same `staff_contracts` row, status stays "none"),
  so the job, start date, language, duties and extra terms are still there after a refresh. A new form starts with the person's own job (position) and its saved duties.
- An item whose selling price is 0 is not offered: left out of the POS item picker and the member order page (still in the admin lists, where the price is set).
- Schedule details: no position field. Each ticked day has its own start / end (`days: [{date, startTime, endTime}]`; new days start with the default hours, any day can be changed, "use the hours above
  for every day" resets them). An added shift can be edited later: pencil on the schedule row → date + hours (`PATCH /api/reborn/admin/shifts/:id`, the worker is notified), or deleted.

## Kitchen / bar screen + auto-printed dockets

- `/kitchen` (pages/reborn-kitchen.tsx; link on the POS page): left open on the kitchen PC / tablet, tabs All · Food · Drinks · Dessert (`shared/station.ts` `stationFor`: the product's own `station`, else from its
  category name; stored on each `pos_ticket_items.station`). Every 4 s it takes the dockets still to print (`POST /api/reborn/kitchen/claim`: sets `pos_ticket_items.printed_at` for accepted, unprinted items —
  each item is handed out once, so two screens never print the same one) and prints one docket per order (`printKitchen`; Chrome with `--kiosk-printing` prints with no window; the native app prints through its bridge),
  with a beep. The list (`GET /api/reborn/kitchen/orders`) shows accepted, not-yet-served items of open bills, oldest first, amber after 10 min / red after 20; the cook taps **Served** per item or **Serve all**
  (the normal `/pos/items/:id/status` call: the member gets "served"). Orders from the member app are accepted at once (`appOrdersAutoAccept`, default on, Admin › Settings; off = the counter taps Accept first
  and the docket prints then). With no internet no new order can reach the kitchen (the server is in the cloud); the screen itself still opens.

- Sell options now live on the inventory item, not in Products: Admin › Inventory › pencil on an item has ⭐ Recommended, "Can be paid with package credit" and "🍺 Bundles & packages of this item"
  (components/ItemBundles.tsx); prepaid credit packages are made in the "💳 Prepaid credit packages" box at the top of Inventory (`CreditPackages`). The Products screen (PC table, phone card, add form) no longer
  has the Package button / box, the star or the bundle fields (`ProductRow` shows them only with `inventory`).

## Venue server (the app on the venue PC, works with no internet)

- The same app runs on the POS PC (`venue/` launcher: its own embedded Postgres + `VENUE_MODE=1`, `CLOUD_URL`, `VENUE_SYNC_TOKEN`; see venue/README.md for install + router). The venue PC is the main copy while the venue is open;
  guests on the venue Wi-Fi open its LAN address (`/venue` = QR page). `VENUE_MODE` (server/venueMode.ts) switches off the cloud-only jobs there: pet decay, daily tokens, tournaments, WhatsApp web + reminders,
  supplier-reorder and payroll reminders.
- Sync (server/venueSync/): a trigger on every table in `policy.ts` writes each change to `sync_log` (changed columns only; counter columns such as credits / kgold / stock as differences). The venue engine
  (`engine.ts`, every 10 s, only when the cloud answers) first copies a snapshot, then pushes its log (`POST /api/venue-sync/push`, applied once: the cloud remembers the last seq) and pulls the cloud's
  (`GET /api/venue-sync/pull`). `apply.ts` replays: insert if missing, update the changed columns + add the counter differences, delete; one failing change goes to `sync_failures` and the rest carry on; the
  trigger is off while applying (`sync.applying`) so nothing echoes. Ids made on the venue start at 1,000,000,000 so they never meet cloud ids. Other companies' rows never leave the cloud
  (`scope` in policy.ts). The cloud keeps its log 30 days; it only starts logging after Admin › Settings › Venue server › Turn on (a token, `app_settings.venueSyncToken`).
- Tested end to end on two real Postgres instances (scripts/e2e/venue-sync.mjs, venue-offline-part1/2.mjs): first copy, sale → cloud with same ids / stock / ledger, cloud edit → venue, counters from both
  sides add up, different columns of one row both survive, sign-up + delete, no echo, repeated push ignored, wrong token refused, and an outage with sales / table order / kitchen docket / sign-up that all
  arrive once when the cloud returns.
- The venue PC download: `node venue/pack.mjs` (on Windows) builds `RebornVenue-windows.zip` (~290 MB: Node, the built app, production node_modules + drizzle-kit, the launcher with its embedded Postgres) in %TEMP%
eborn-venue-pack.
  Unzip → `Start Reborn Venue.bat` → a setup page on http://localhost:3000 asks for the cloud address + token (checked against the cloud) → the launcher makes its Postgres, creates the tables with drizzle-kit (all on the first start,
  only additions on later starts), starts the app in VENUE_MODE and opens it. `config.json` and `data/` sit next to the folders, so a newer zip unzipped over it keeps them. Tested from an empty folder: setup page, own database, first
  copy of the cloud data, login with the cloud password, sync status online.

## Happy hour + same item from several suppliers

- Happy hour is set on the inventory item (Admin › Inventory › pencil › 🍹 Happy hour): from / until (`happy_start` / `happy_end`, "HH:MM", past midnight allowed), an optional happy price
  (`happy_price`, empty = same price) and "only sell during this time" (`happy_only`). Rules in shared/happyHour.ts, on the clock of the company's country (`countryOf(companyCountry()).timezone`).
  The admin list keeps the normal `price`; `/pos/products` adds `salePrice`, `happyNow`, `offHours` (an off-hours item is `soldOut`, so the POS picker leaves it out) and the POS uses `salePrice`;
  `/shop/products` returns the happy price as `price` and hides off-hours items. The server charges the price itself (`resolveItems`) and refuses an off-hours item (offline-sold bills excepted).
- Items entered twice (same name, e.g. one per supplier): a bundle or visits package added in Inventory › an item is made for each of them, and editing / deleting a piece also changes its copies
  (`ItemBundles`: `twins` / `copiesOf`). Inventory lists every item including those with no stock; bundles / packages whose item is not listed show under "Other bundles & packages".

- Product pictures are stored in the row as data: URLs (~70 KB each; the live table was ~1.8 MB, so every Inventory / POS list was ~2 MB twice). Lists (`/pos/products`, `/shop/products`, `/admin/inventory`)
  now send `/api/reborn/pos/product-image/:id?v=…` instead (`productImageLink`; the route serves the bytes, cached for a year). A page that sends such an address back (edit, new bundle) keeps / copies the
  stored picture (`pictureFromAddress`) — never write the address into `image_url`.

- Ready → collected: the kitchen screen's button is **Ready** (item status `ready`, left off the kitchen list, still on the bill); every staff / admin device then vibrates + beeps every 3 s
  (`components/ReadyItemsAlert.tsx` in RebornLayout, polls `GET /api/reborn/pos/ready-items` every 5 s, quiet on the `/kitchen` screen) until someone taps **Collected** (the normal status call → `served`, the member
  is told then, not at "ready"). The POS bill line shows "ready" with a Collected button too.

- Stock in / out from Inventory: Admin › Inventory › pencil on an item › 📦 "Add or take out stock" (components/StockAdjust.tsx, same `POST /api/reborn/pos/stock-in`). **Add stock**: quantity, supplier, unit cost and the
  date & time it arrived. **Take out**: quantity, a reason (Damaged / broken, Expired, Spilled, Staff / free use, Count correction, Other = note required) and a date; the reason + note go on the movement, the server refuses
  more than is in stock (unless negative stock is allowed) and books a `loss` expense at cost (`refType stock_out`) for every reason except "Count correction". The count itself is still never typed over.
- Stock panel entry by unit or by box: "By box" asks for boxes, units per box (pre-filled from the item's pack size) and the price of one whole box; the server still gets units (boxes × units per box) and a per-unit cost (box price ÷ units per box), so costing and history are unchanged.
- POS item picker (tables, bills, Quick sale): the selected-items panel with the charge / add button is sticky above the bottom menu (`sticky bottom-20`), so after ticking items far down a long list it is still on screen; its item list scrolls inside (max 10rem).

- Lights stay saved on the phone: the app shim remembers every light the admin chose (`reborn.ble.known` in the phone's storage) and returns them through `navigator.bluetooth.getDevices()`; the Lights page keeps its own list
  (`lights.saved`: id, name, command style, group) and on opening rebuilds each light from it without scanning or connecting (`restoreSavedLights`; a light connects when it is first used). The list is written only after the restore, and removing a
  light also forgets it (`forgetDevice`). In a plain browser without `getDevices` the lights are chosen again each visit. The chooser in the app has Select all / Clear / Scan again. Needs a new app build for the shim part.
- Services (corkage, room fee): Admin › Products › "This is a service (no stock)" (`pos_products.is_service`): cost and stock are forced to 0, it is never sold out (POS, member list), `moveStock` does nothing for it, and it is left out of Inventory, the POS Stock tab and supplier-reorder lists. Sold like any item at its price.
- Own bottle + corkage (POS › Bottles › Keep a bottle): tick "Customer's own bottle" to type any bottle name; pick a corkage service (a product marked as a service) and the table, and `POST /api/reborn/pos/bottle-keep` adds that service to the table's open bill (created if none) once per bottle kept. Only a service product can be used; the bottle is saved with the note "Own bottle".
- Corkage at checkout: the pay panel's "Keep unfinished bottle with this checkout" box (`KeepBottleCheckout`) has "Customer's own bottle" (typed name, saved with the note "Own bottle") and a corkage picker whose button adds the service to the bill being paid (once per bottle) before it is charged. In Quick sale the corkage is picked as a normal item in the sale (no button there).
- Receipt numbers + PDF name: every paid bill has a number within its venue day (1st customer = 1 ..., restarting at 08:00; refunded bills keep theirs): `receiptNumbers()` (window function over `pos_tickets.paid_at`), returned as `receiptSeq` / `receiptDay`
  on the pay responses and on `GET /pos/orders?status=paid|refunded`. The receipt prints "No. 001" and the print window's title (so Chrome's Save as PDF) is `Receipt_<day>_<001>` (`printReceipt` in lib/receipt.ts).
- Admin › Bottles › "Keep a bottle (after the bill)": for a customer who already paid and left some drink (member search, type, how many left, typed name, photo for wine / whisky, note) — the same `POST /pos/bottle-keep` as the POS Bottles tab.

## Karaoke box on the venue Wi-Fi (venue/karaoke-bridge.mjs)

- The venue's karaoke box has its own "phone song ordering" web page (http://<box ip>:8084/demo/, QR on the TV) built on JSONP servlets: `SearchServlet` (songName, page -> songList with sONGBM = song number, sONGNAME, sINGER, cLOUD),
  `PlaylistServlet` (number = songs playing + waiting), `CommandServlet` (cmd Add1 + song number = order it, Pro1 = play next, Skip = cut the song on now, Del1, Play = pause/resume, volume Mic_/Music_ up/down).
- `node venue/karaoke-bridge.mjs` (plain Node 18, on a PC that sees both the box and the internet; env CLOUD_URL, KARAOKE_TOKEN from Admin › Requests › Karaoke system, BOX_URL, optional TENANT_SLUG) joins our fair queue to the box:
  it orders the app's "on now" song on the box (the app's karaoke code, else a title + artist search), only when the box is idle, calls `POST /api/karaoke/next` when the box is idle again, and sends Skip to the box when
  the app skipped or cancelled the song. Paused queue = nothing ordered; songs not in the box's list are skipped. Tests: `npx tsx --test venue/karaoke-bridge.test.ts`; search + count were also checked read-only against the real box.
- Gifts on the karaoke picture: the TV overlay page (Admin › Lights & TV › TV) as a see-through layer; the box's own page has no gift feature.

- Admin › QR codes: tap any table QR (or the Wi-Fi code) for a big view with "Download as image" (a PNG drawn in the browser, `lib/qr-download.ts` + `components/QrBigView.tsx`). A QR holds one thing, so the table QR (check-in link) and the venue Wi-Fi
  (`WIFI:T:WPA;S:name;P:password;;`, a phone camera offers to join the network) are two codes: the main admin saves the Wi-Fi name / password / security in the "Venue Wi-Fi QR" card (settings `wifiName`, `wifiPassword`, `wifiSecurity`), and each
  table's big view then also offers one card with both codes side by side ("1. Scan to join Wi-Fi", "2. Scan to check in at table X"). Managers (no settings access) see the table QRs without the Wi-Fi card.
- API error clean-up (from Admin › Errors): the app reports one failing call once a minute instead of on every retry (`reportClientError`), the POS bill quote does not refetch within 3 s or on focus, the ready-items alert stops polling after a 403, and
  table rename / ticket merge are re-run when Postgres reports a deadlock (`retryOnDeadlock`, code 40P01).
- Saving a QR card (`saveCardImage` in lib/qr-download.ts): a web view cannot download files, so inside the phone app the card goes to the app's print window (`PRINT_HTML`, the admin picks Save as PDF); in a phone browser it opens the share sheet with the PNG (Web Share files); on a computer it is a normal blob download. The big view tells the person which one happened.
- Reset Kings of Singers (`POST /api/reborn/admin/kos/reset`, main-admin password like the other reset): every member's KGOLD is set to 0 (old balances are first saved in `app_settings.kosResetBackup` = { at, balances }, so a mistaken reset can be undone),
  and `kosRankingSince` + `giftLevelsSince` are set to now: the Tonight / This month ranking and the Gifter / Star levels count only gifts after it. The gift history (`kos_gifts`) is kept. Tested: scripts/e2e/kos-reset.mjs.
- Members search the box's own song list (`GET /api/reborn/songs/search` also asks the box through the bridge): the cloud cannot reach the venue Wi-Fi, so the bridge holds `GET /api/karaoke/jobs` open (up to 20 s); a member's search text becomes a job,
  the bridge runs it on the box (`SearchServlet`, 2 pages) and answers `POST /api/karaoke/jobs/:id`. Box songs come first (🎤, `source: "karaoke"`, `karaokeCode`), a library song with the same title + singer is dropped; no bridge asking for 45 s = `boxConnected: false` and
  only the library. A request with `karaokeCode` finds or makes the library song with that number (`songs.karaoke_code`), so the bridge orders it by number with no title matching. The box holds ~200,000 songs, which is why they are searched live, not copied.
  `venue/start-karaoke-bridge.bat` starts the bridge on a Windows PC (paste the token into it; never commit the token). Tests: scripts/e2e/karaoke-search.mjs, venue/karaoke-bridge.test.ts.
- The box's own search is weak for Chinese (it matches pinyin initials and misses many titles), so the bridge reads the box's whole song list once (empty search, 15 songs a page, ~13,600 pages, 4 at a time, a few minutes) into memory and
  `venue/karaoke-catalog.json` (git-ignored, reused for 24 h) and searches that: title or the pinyin the box writes beside the singer, whole title first. Until it is ready the bridge falls back to live searches by text and by initials (the app sends both:
  `boxQueries` on the queue board, `queries` on a search job, from `boxQueries()` in rebornGame.ts). Ordering a requested song uses that list too (`pickSong` on title + singer).
- Only songs the box has: while the bridge is connected (asked for work in the last 45 s) members search only the box's songs (🎤), browse only library songs linked to a box number (`GET /api/reborn/songs`; admin screens use `?all=1` and see everything),
  and a request must carry a box number — a picked box song (`karaokeCode`) or a library song the bridge linked (`songs.karaoke_code`); anything else is refused ("not in our karaoke system"). The bridge links the library every 6 h after reading the box's list
  (`linkLibrary`: `GET /api/karaoke/library`, `POST /api/karaoke/link`). No bridge = the library, Spotify and free suggestions work as before.
- QR on the receipt printer: (1) every customer receipt can carry a QR under the items (customer copy only, not the merchant copy): Admin › QR codes › "QR code on the customer receipt" (settings `receiptQrKind` none | wifi | review | link,
  `receiptQrLink`, `receiptQrCaption`; what it holds is `receiptQrText()` in shared/receiptQr.ts, sent to the POS as `receipt.qr = { text, caption }` on the pay response and drawn at once by `qrSvgNow`); the Wi-Fi text format lives in shared/wifi.ts.
  (2) the big view of a table QR / the Wi-Fi code has "Print on the receipt printer" and, with the Wi-Fi saved, "Print slip: Wi-Fi + table" (`printQrSlip`, 80mm, same print path as receipts: computer = print dialog / kiosk printing, phone app = its print window).
  A phone browser cannot print: it shows "use the download instead". Tests: scripts/e2e/receipt-qr.mjs.
- Who ordered what: every bill line records the person who ordered it (`pos_ticket_items.added_by`, `added_by_name` = the staff member's name, real name when set, or "Name (app)" for a member's own order, `added_at`) — set in `appendItems`, so a second staff member
  adding to the same table's open bill shows under their own name. The POS bill shows "ordered by <name> · <time>" under each line. Admin › Logs gets an `add_items` entry for every order added to a table ("Table 5 (T123): ordered 2× Beer, 1× Burger", the acting
  person is the log row's admin), and the `edit` / `remove` entries now say who ordered the line ("Removed 1× "Burger" (ordered by Wati)") — a removed line is deleted, so the log is the trace. Test: scripts/e2e/ordered-by.mjs.
- Bundle names put the quantity first: a bundle made in Inventory is named "6 x Bintang Beer Pint 330ML" (`ItemBundles`); the live bundles were renamed the same way on 2026-10-17 (the old "... ×6" suffix and doubled suffixes were removed, the number comes from `bundle_qty`).
- The app never starts a song by itself (a request is only `pending` until staff press Start or the bridge asks): the bridge calls `POST /api/karaoke/next` when nothing is on in the app, the queue is not paused, members are waiting and the box is idle, so a request begins playing within a few seconds.
- Kitchen: any staff / admin / manager can open /kitchen and tap Ready; the name is kept (`pos_ticket_items.ready_by_name`, `ready_at`; `served_by_name` for who collected). `GET /pos/ready-items` returns `readyByName`; the staff alert says "ready by <name>", the POS bill line shows "ready by <name>" / "served · <name>", and the kitchen screen has a strip "Ready, waiting to be collected" listing the items with who made them ready.
- POS item tile: the "Pack ×N" button sits under the tile (not over it, which the phone-wide button rule used to make huge) and is not shown on bundles or packages.

- Songs page = the karaoke system's own catalog: the member Songs tab (pages/reborn-song.tsx `SongSystem`) shows singer photos and the box's songs (search, or tap a singer), no Top 500 list; a request carries the box's song number (`karaokeCode`) so the right song plays. The bridge also reads the singers list (`venue/karaoke-singers.json`, git-ignored) and serves `GET /api/reborn/karaoke/singers|singer-songs|photo/:file|status` through the same job broker (kinds search / singers / singer / photo). Box offline = a message, no list.
- Queue + the system: the bridge reports songs waiting on the box itself (`POST /api/karaoke/box-state`, memory only, fresh for 30 s); members see them under the queue ("Ordered on the song system") and admin Requests has an "On the song system itself" card (`GET /api/reborn/admin/karaoke/box-playlist`). The app queue is what the box follows (the bridge orders one song at a time).
- Voice + repeat + skip: each request has `vocal` ('karaoke' | 'original' = the singer's own voice on) and `repeatCount`. The bridge presses the box's MuOr toggle when the wanted voice differs from what it last set (the box cannot say which is on; it assumes karaoke at start) and sends Reset (replay) when the singer presses Repeat. The singer skips/repeats only their own song that is on now (`POST /api/reborn/songs/my-requests/:id/skip|repeat`). My Requests lists only waiting / playing songs (no history), and the admin song queue has no confirm()/prompt() dialogs. Test: scripts/e2e/karaoke-system.mjs.

- Commission on a sale (POS pay panels + Quick sale): our own cost, never added to what the customer pays and never printed on the customer's copy. Admin › POS › "Commissions" (admin only) saves a list (`appSettings.commissionTypes`: name + % or fixed amount; `PUT /api/reborn/admin/commission-types`, cashiers read `GET /api/reborn/pos/commission-types`); the pay panel's "Commission" box picks one or types a name, the person paid and a % / amount (`commission: {label, payee, kind, value}` on `/pos/orders/:id/pay` and `/pos/sale`). The server works the amount out on the bill after discount (`commissionOf`, never above the sale, percent ≤ 100), saves it on the ticket (`pos_tickets.commission_label/payee/amount`) and books one `commission` expense (`refType pos_commission`); a refund books it back as income (`pos_commission_reversal`). The merchant (sales) copy of the receipt shows "Commission <name> · <person>" and the customer copy has no line (`receiptHtml(..., showCommission)`). Test: scripts/e2e/commission.mjs.
- Print the bill before the customer pays: the table bill's pay panel has "Print bill for the customer" (`printBill` in lib/receipt.ts): items, discount, service fee, tax and the total due from the live quote, titled "BILL — please pay", no payment lines, no QR, no commission.
- Receipt paper of this PC (POS › "Receipt paper", saved in the browser): roll width 58 / 80 mm and "move print to the right" (mm) for a narrow roll in a wide printer; "Print a test slip" shows both edges.
- Receipts leave out lines that are off the bill (`rejected`, `lost`, `cancelled`: `OFF_RECEIPT` in lib/receipt.ts), matching the total. POS › Sales has a day picker and a "Print duplicate" button per bill: `printReceipt(order, meta, { duplicate: true })` marks every copy "DUPLICATE · Printed again <time>" and names the PDF `Receipt_<day>_<no>_duplicate`.
- Paper test ruler (POS › Receipt paper › Print a test slip): prints a 0–80 mm ruler across the whole head with no shift; the cashier types the first and last number they can read and "Set from the ruler" saves `shiftMm` = first, `widthMm` = last − first (this PC, browser storage).
- Copies per receipt (POS › Receipt paper, saved in this browser): default is ONE copy (the customer's); "2" adds a sales copy first. A bill with a commission always prints the sales copy (where the commission and its base are shown) — `getReceiptCopies()` in lib/receipt.ts.
- Commission in the sales views: POS › Sales shows each bill's commission (name · person · amount) with its sale amount before service fee and tax, and a card with the day's two totals; the end-of-day report totals carry `commission` and `salesNet` (subtotal − discount), print them, and the profit figure subtracts the commission (our own cost).

- No WhatsApp for these (in-app + phone push stay): the song "you're on now" message to the singer, the admin WhatsApp when a member sends a new order from the app, and the admin WhatsApp for a new WhatsApp / Messenger / Instagram lead. Other admin WhatsApp alerts (bookings, service calls, hand-offs, low stock) are unchanged.
- Admin › Products no longer lists bundles (they are made on the inventory item and sold in the POS); services stay out of Inventory. The PC product table has a "Service" tick per row (the phone card's edit form already had it); turning it on sets the cost to 0 (`PATCH /admin/pos/products/:id`).
- Receipts (Admin › Inventory / Accounting › "Scan a supplier receipt"): the AI (needs `ANTHROPIC_API_KEY` on the server — without it only typing the lines works) reads the supplier, phone, invoice no., date and lines, and says if the receipt is **goods for stock** or an **expense** (rent, utilities, salary, other). Goods: a line priced per box (Dus / Ctn-24) carries `packSize` (printed size, else the matched item's `units_per_pack`), so stock gets qty × packSize units at price ÷ packSize each; an unmatched line makes a new item (hidden from the POS, price 0) with supplier, phone, pack size and box price. The stock movement and the `purchase` expense are dated the receipt's day (12:00 Jakarta; a future day falls back to now). Expense: `kind: "expense"` books ONE ledger expense line (`refType receipt_expense`, category rental / utilities / salary / other, the bill's day, photo attached) and touches no stock. Test: scripts/e2e/receipt-save.mjs.
- The receipt reader learns (table `receipt_memory`, helpers `applyMemory` / `supplierKeyOf` / `lineKeyOf` / `expenseKeyOf` in server/receiptLogic.ts): every saved receipt remembers, per supplier, which inventory item each printed line is and its pack size (latest choice wins, `uses` counts), the supplier's kind (goods / expense + category), and for expenses each bill line without its month or numbers ("Electricity October" = "Electricity November") with its category. A new photo is filled from this first (`learned` count in the read answer: "N filled in from receipts you saved before"), then the AI's own match. It is a memory, not model training. Tests: server/receiptLogic.test.ts, scripts/e2e/receipt-save.mjs.
- Admin › Events: "Post event" opens an empty form (not saved yet); the event is created, shown on the home page / login and announced to members only when it is saved with a title (Cancel drops it). Before, the button created a blank "New event" at once, live and announced.
- Income in Accounting comes from sales only: a member top-up gives the RP credits but is NOT booked as income (prepaid money); a bill paid with RP credits IS booked as `product_sale` income when it is paid, and refunding it books the refund like any other bill (the credits also go back). The 10 old top-up ledger rows (Rp 126,400,000, 23 Sep–2 Oct) were removed from the live accounting on 2026-10-18 (backup: ledger-topups-backup-2026-10-18.json). Test: scripts/e2e/credits-income.mjs.
- Games: Rock Paper Scissors and Frog Jump are retired (`RETIRED_GAMES` in server/games.ts: not in the lobby lists, `GAME_KEYS` or room creation; their engine code is left in place and the tie-break rematch is separate). Red Light, Green Light judges each tap by WHEN it was made: the phone sends `ago` (ms since its newest unsent tap) and `isTapOnRed` (server/redLight.ts, 800 ms grace, also covers the red that has just ended) decides, so lag cannot eliminate a player who stopped in time. Stop the Timer: the stop shows locked at once on the phone and sends the player's own tap time `ms` on the shared clock (trusted up to 1.5 s earlier than the request arrived, `TIMER_LATENCY_MS`); the phone's clock offset uses the best (largest) reading and never jumps back. Tests: server/redLight.test.ts.
- One-click setup of the karaoke bridge for another PC or company: Admin › Requests › Karaoke system › "Download the setup file for a venue PC" (`GET /api/reborn/admin/karaoke/setup-file`, admin only, `karaokeSetupBat` in server/karaokeSetup.ts) gives `Start-Karaoke-Bridge.bat` holding this company's address, token (the existing one is kept, never changed by the download) and `TENANT_SLUG`; on the venue PC it fetches the latest bridge from `GET /api/karaoke/bridge.mjs` (public, no secrets; served from `venue/karaoke-bridge.mjs`, which the Docker image contains) and starts it. With no `BOX_URL` the bridge finds the box itself (`findBox`: every address of the PC's /24 networks, port 8084, answers `SearchServlet` with a song list; kept in `venue/karaoke-box.json`, git-ignored). It runs on a PC, not a phone, so there is no phone QR for this. Tests: venue/karaoke-bridge.test.ts, server/karaokeSetup.test.ts, scripts/e2e/karaoke-setup.mjs.
- CCTV cameras by QR (Admin › Security › Cameras › "Scan a camera QR" / "Use a picture of the QR", `components/CameraQrScan.tsx`, parser `parseCameraQr` in shared/cameraQr.ts): a QR holding a web address (or an IP, `ip=…;port=…`, JSON) adds the camera with its name and address filled in; a video address (rtsp) or only the maker's cloud ID (Ezviz, Hik-Connect, XMEye, Tuya …) cannot be shown in a browser, so the admin is told what to do (go2rtc, Find nearby, or a web address in the camera's settings).
- Each TV screen (Admin › Lights & TV › TV) has "Show QR": a QR of the TV's own address (`/tv/<token>`) to scan with a phone and cast to the TV, or the address is typed in the TV's own browser. A TV is linked by opening its address, not by finding it on the network (the "Find nearby" scan only lists TVs that answer UPnP/SSDP; many TVs, and phones with a private Wi-Fi address, do not).
- Linking a TV by code (no long address to type): the TV's own browser opens the short address `/tv` (pages/tv-pair.tsx), which shows a 6-digit code (`POST /api/tv/pair`, in-memory `TvPairings` in server/tvPairing.ts: 15 min, one use, max 500 open); the admin types it in Admin › Lights & TV › TV › that screen › "Link a TV by code" (`POST /api/reborn/admin/tv/pair` {code, screenId}) and the waiting TV (polling `GET /api/tv/pair/:code` every 2 s) moves to `/tv/<token>` (with `?tenant=` for a company on the shared host). Tests: server/tvPairing.test.ts, scripts/e2e/tv-pair.mjs.
- Gifts on top of the karaoke picture, no address or switching: an Android overlay app for the karaoke box (`tv-overlay/`, plain Java, no libraries: `MainActivity` set-up screen, `OverlayService` draws a transparent, untouchable, always-on-top WebView of the linked TV screen's page, `BootReceiver` starts it with the box, `Link` keeps the app address + linked page and does the pairing calls). It links like any TV: it shows a 6-digit code, the admin types it next to a TV screen whose view is **overlay** (no tables = every gift). GitHub Actions (`.github/workflows/tv-overlay-apk.yml`, runs when tv-overlay/ changes) builds it and publishes `https://github.com/ZENSEE1314/rebornwavegroup/releases/download/tv-overlay-latest/reborn-tv-overlay.apk`; the signing key is kept in the Actions cache, so a lost cache means uninstall + reinstall once. The box's WebView must be recent enough for the page (Chromium ~80+). Not yet run on the real box.
- Songs screen: one button "Singer's voice ON / OFF" (no Self sing / By singer picker, no pinyin shown on rows or singers; pinyin typed in the search still matches). The singer can switch the voice at any time for their own waiting or playing song (Queue tab: button on the song on now, chip on their waiting rows) — `POST /api/reborn/songs/my-requests/:id/vocal`; the bridge presses the box's MuOr button whenever the wanted voice differs from what it last set (also while the song plays). The box's phone page only knows these commands: Add1, Pro1, Pro2, Del1, SelReplay, Play, Mute, MuOr, Skip, Reset, Tone_up / Tone_normal / Tone_down, Music_up / Music_down, Mic_up / Mic_down (no message / gift / effect command, so gifts cannot be drawn by the box itself).
