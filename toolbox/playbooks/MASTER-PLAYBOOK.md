# Reborn Wave Group + BridgeX: the master playbook

One playbook for the whole system: the task, the goal, the steps in order, every function we built, your ideas and where each stands, the rules, and what "done" looks like. It replaces the separate playbooks (change process, POS, BridgeX), which stay as detail. Every tool, script, template and doc lives in the `toolbox/` folder (index: `toolbox/README.md`); section 6 "Toolbox rules" says when each one must be used.

Contents
1. The task and the goal
2. The system on one page
3. The steps in order (company, venue day, member journey, change loop)
4. Every function, by area
5. Your ideas and their status
6. The rules
7. Runbooks
8. What "done" looks like
9. Open items and what only you can do

---

## 1. The task and the goal

**Task.** Run one platform that has two faces:

- **Reborn Wave Group**, the venue: a five-floor club (1F lounge and games, 2F private KTV and beauty, 3F VIP, 4F pet cafe, 5F live stage) with a member app, POS, kitchen, karaoke, bookings, WhatsApp bot, accounting and payroll.
- **BridgeX / BridgeXPOS**, the product: the same system sold white-label to other businesses, each as a separate company with its own data, brand, logins and WhatsApp.

**Goal.**

- The venue trades every night: bills, stock, songs, bookings, staff and money are right.
- Every number can be traced to a bill, an upload or a person.
- A new company is live in a day and can never see another company's data.
- The data is safe, backed up, and nothing secret sits in code or chat.
- You run it from the website (settings, keys, ticks, rates), not from code.
- It keeps working when the internet or the host fails.

---

## 2. The system on one page

| Part | What it is | Who uses it |
|---|---|---|
| **Member app / site** | Home, events, booking, order food, songs, KOS gifts, games, pet, profile, referral | Members, guests |
| **POS** | Tables, Quick sale, pay, receipts, packages, bottles, on-account | Cashiers, managers |
| **Kitchen / bar screen** | Dockets, Ready, Collected | Kitchen, bar |
| **Customer screen** | Bill and posters on the second monitor | Customers |
| **Admin panel** | Bookings, inventory, products, accounting, payroll, staff, settings, errors | Managers, main admin |
| **BridgeX console** | Companies, applications, white label, app functions | Platform team |
| **WhatsApp / Messenger / Instagram / Telegram bot** | Same bot on all channels | Members, staff |
| **Karaoke bridge, TV screens, lights, cameras** | The venue's equipment | Staff, guests |
| **Venue server / PC copy** | The app running on a PC, with or without internet | The venue |
| **Backups, security, keys** | Nightly encrypted copy, hardening, keys saved in the website | Main admin |

Where things live: working copy `C:\Users\Zen See\AppData\Local\Temp\rw-song-wt`; deploy by `git push origin HEAD:main`; PC copy `C:\RebornStandby\app` (task `RebornStandby`, port 3999, live database); live database address only in `C:\RebornStandby\database-url.txt`; tests on spare ports only (Postgres 54339, servers 3998 / 3997); detail notes in `CLAUDE.md`; safety in `SECURITY.md`.

Roles: **member** (app), **staff** (cashier and floor), **manager** (a staff account whose company role is manager), **main admin** (everything; protected actions ask the main-admin password), **platform team** (BridgeX console). The main admin can hide tabs from one person; the server still decides by role.

Languages: every visible text exists in **English, 中文 and Bahasa Indonesia**.

---

## 3. The steps in order

### 3.1 A company joins (BridgeX)
1. Apply on the BridgeX host or be created in the console. Choose country (sets currency, tax habits, payroll rates), industry and slug.
2. Platform team approves. The owner becomes the company's main admin.
3. A data space is made (`schema` mode: Postgres schema `tenant_<id>`; `dedicated` = own server; `shared` = Reborn only). Reborn-specific starter content is not copied.
4. Brand it: name, logo, icon, share picture, domain, design (10 dark, 5 light business styles), palette or own colours, font, pet name and pictures.
5. Choose functions (App functions) and its industries.
6. Set tables and booking areas, tax and service fee, receipt details, payroll rules.
7. Create its app admins from the console; they add staff and managers.
8. Load products, stock and suppliers (Excel import); make bundles, packages, happy hour.
9. Connect channels (its own WhatsApp number, Messenger, Instagram, Telegram) and hardware.
10. Test day: order, kitchen, pay each way, refund, close the day, read accounting and payroll. Then live.

### 3.2 A venue day (POS)
**Before opening:** staff signed in; POS opened once online on each device; kitchen screen open; receipt paper set; tax and service fee, prices, stock, happy hour, commission rules checked; customer screen open.
**Open a bill:** table (one open bill per table, or a member's QR scan), or Quick sale. Tag the member.
**Add items:** picker groups (🍹 Happy hour, ⭐ Recommended, 📦 Packages, categories); hidden: sold out, price 0, happy-hour-only outside hours. Each line records who ordered it. Pick **Commission to** on ladies-drink lines. Fix a line with Edit, Move, Remove or Lost.
**Kitchen and bar:** docket prints once per item, cook taps Ready, every staff device alerts until Collected. Service calls alert until accepted.
**Pay:** check the quote; print the bill if asked; pay cash, card, RP credits, package credit or Split; commission box if an agent or driver is paid; keep an unfinished bottle; or put the bill on account. Receipt prints with a number.
**Offline:** Quick sale only (cash or card), sent once when the internet returns.
**Refund:** puts back stock, credits, commissions.
**Close:** settle or put on account every bill, Close POS day (manager or main admin), read and print the closing report, count the drawer, upload the day's receipts and expenses.

### 3.3 A member's night
1. Install or open the app; sign up with email or phone (email optional) or through a chat.
2. Scan the table QR: checked in at that table (any number of people per table); a table booking checks them in automatically.
3. Order food and drinks (pay at the table), request songs, send KOS gifts, play games, care for the pet, collect the daily login reward, earn points and referral rewards.
4. Rate staff and send feedback.

### 3.4 Every change to the system (the loop)
1. Read the request the way the owner means it; pick the likeliest meaning and say so.
2. Look at the real data first (read-only on the live database). Check Admin › Errors for anything that "shows an error".
3. Find the cause, not only the symptom. Say what cannot be fixed (a network drop).
4. Change the smallest thing; match the surrounding code; build for all companies.
5. Texts in three languages.
6. Unit test the rule, end-to-end test the flow, run everything on spare ports (build, unit, e2e, rate-limit): `toolbox/scripts/run-tests.sh` (rule T2).
7. Check visual changes in the browser pane.
8. Write the note in `CLAUDE.md` (and `SECURITY.md` for safety).
9. Run `toolbox/scripts/approve-change.mjs` (rule T1); only when it says APPROVED TO PUSH: build, commit (with the Claude trailer), push.
10. Update the PC copy with `toolbox/scripts/update-pc-copy.ps1` (rule T3; it stops the task, frees port 3999, copies `dist`, plus `node_modules` and `package.json` with `-WithModules`, starts, and waits for it).
11. Report plainly with `toolbox/templates/change-report.md` (rule T8): what was wrong, what changed, where to find it, what was tested and what was not, what is still open.

---

## 4. Every function, by area

### 4.1 Member app and site
- **Home** with upcoming events as a swipe row; **3D tower homepage** (one page per swipe, five floors, lift cards) with a "Normal site" button and a lite site (`/welcome`) for weak phones and a "3D mode" button back. Fast first load: lazy pages, small images, H.264 video.
- **Sign-up and login** by email or phone in any format; Facebook, Instagram, Telegram chat sign-ups with a WhatsApp code; one-tap chat login links.
- **Events:** admin posts events with dates; app Events page of A4 posters; WhatsApp option 4 sends them; booking a date with an event shows its poster.
- **Booking** by area: tables or rooms, appointments by date and time, services at the customer's address. Rules: table day lock, hours question on or off, special requests (birthday, event, cake), last booking time, per-table max pax, full times shown as Full with other areas suggested, arrival (staff tap or table QR scan) with welcome WhatsApp, late arrival, paid and left releases the table.
- **Order food and drinks** from the app at a table you scanned: groups (Happy hour, Recommended, Packages), happy-hour price and "1+1" mark, sold-out hidden, scan-first card.
- **Call service** for a seated member; shows on the POS tables screen until Done.
- **Rate staff** (1–5 stars, comment) and feedback; the main admin can hide people (for example shareholders).
- **Daily login reward:** 30-day calendar, animations by day, coins, points, tokens, KGOLD or a prize; auto-collect on or off.
- **Offline reading:** the whole app opens offline from the last answers; changes need internet.
- **Phone app** (Android and iOS wrap): table QR opens in the app (App Links, Universal Links); Bluetooth lights and Wi-Fi scan built into the app.

### 4.2 KOS: Kings of Singers, gifts and ranking
- Table QR check-in; venue day 08:00 to 08:00 WIB, everyone checked out at 8am.
- **Gifts** only to members checked in tonight, each with its own full-screen scene and sound (kiss, thumbs up, lion, whale, rocket, rose, heart, drinks, cake, teddy, money, box), optional rendered clips.
- **Gift levels:** Gifter and Star, 50 levels each, rings that change every 5 levels, level-up animation, admin sets the formula or exact list.
- **Ranking:** Tonight and This month tabs with each member's top 3 gifters on a podium.
- **Reset Kings of Singers** (main admin, password): KGOLD to 0 with a saved backup, levels and ranking restart.
- Gift scenes also play on TV screens.

### 4.3 Songs and karaoke
- **Song queue without approval:** every request joins tonight's fair queue; each member or table gets N songs per turn; statuses pending, playing, confirmed, skipped, cancelled. Table mode needs a table scan.
- **Staff controls:** Start, Done, skip, pause, play next, cancel one or a whole table's songs, repeat.
- **Karaoke bridge** (a PC on the venue Wi-Fi): joins the queue to the karaoke box; searches the box's own songs (live and from a catalog), singers with photos; only songs the box has; members see singer photos and song lists; the singer's voice on/off, repeat and skip for their own song; room controls (pause, mute, volume) for guests checked in; admin song-system controls.
- **Songs loaded ahead** (setting, off by default): the box's playlist holds the next N songs so the next starts at once. **Built and tested against a pretend box only.**
- One-click setup file for a venue PC or another company.
- WhatsApp: song requests only after menu option 2.

### 4.4 Games, pet and rewards
- **Game rooms** (party, dice, cards, drinking games: 789, 6 Cups, Uno, In Between, Up or Down, Red Light Green Light, Stop the Timer, Lucky Wheel, Liar's Dice, Card Match, poker, bridge and others) with rank stars, pet coins, tie-break, rooms that survive restarts. Rock Paper Scissors and Frog Jump are retired.
- **Pet (Doluruu):** alive in its room, mood, reactions, speech, cartoon puppet on a WebGL mesh; shop with costumes (five outfits) and furniture; pet coins; confirm boxes in the app. Each company can rename the pet.
- Points, tokens, KGOLD, RP credits, spin and prizes, daily reward.

### 4.5 WhatsApp, Messenger, Instagram, Telegram
- One bot on all channels: menu (booking, song, events, what we have), language switch by name or menu, FAQ answers, learning questions (Admin › FAQ: unanswered questions wait at the top), hand-off to staff with pause and a notice, member can type AI to bring the bot back.
- Messages the club sends go through `sendToMember`: retried, saved in the CRM chat, failures flagged.
- **Connect with Meta** in one login (Page, Instagram, WhatsApp number); per-company settings; Telegram bot by token with a QR.
- Reminders: kept bottles, package expiry, come-back, payday; run per company.

### 4.6 POS
- Tables and Quick sale, member tagging, packages (visits and prepaid credit with a perk once used), bundles, packs, services (corkage), own bottle and corkage, kept bottles with expiry.
- **Bill rules:** tax and service fee per bill (the rates it opened with; on or off; optional cashier override), member perk, app-order discount, package credit, staff price (50% or at cost), sell at cost, edit a line, Lost with charge to staff, move table.
- **Pay:** cash, card, RP credits, package credit, **Split** (credits + card + cash); commission box (agent, driver) never on the customer's copy; **on account** (kept open, printed, carried to the next day).
- **Receipts:** number within the venue day, copies, QR (Wi-Fi, review, link), paper width and shift shared by every browser, duplicate, ruler test slip, print the bill before paying.
- **Offline Quick sale**, queued and sent once.
- **Customer screen** on the second monitor; **kitchen/bar screen** with Ready and Collected alerts; **Windows POS app** (Electron, silent printing, cash drawer kick; not yet run on a real PC).
- Recommended items, sold-out hiding, per-item staff commission, ordered-by on every line.
- **One "Commission to" section** on the pay panels (a staff member through payroll, or an agency whose name is typed by hand) instead of a salesperson dropdown plus a separate commission box.
- **Work area:** on a PC the bill and the ordering are two panes that scroll on their own; on a phone the bill is first and the ordering below. The receipt and other pop-ups always appear in front of the page.

### 4.7 Inventory, products, suppliers
- Products with category, department, price, cost, stock, picture, **sold by the pack** (cost per unit from pack price), **same item from several suppliers** (oldest stock first costing, layers per supplier and price), **happy hour** (window, price, buy-X-get-Y-free, only in hours, chosen weekdays; set per item, for many items, or item by item), **per-item ticks** (app discount, referral commission; bulk setter), **bundles and packages** made on the item.
- **Stock in and out** in Inventory (by unit or by box, delivery date and time; take-out reasons with a loss booked); stock is read-only otherwise. **Add stock** fills in the price from the chosen supplier's last delivery, takes another supplier (or a new one typed in) in the same form with no duplicate product, and can upload a receipt from the same panel.
- **Excel import** (columns found by title in three languages); **supplier reorder** drafts (off by default; nothing is sent without a tap).
- Items with price 0 or no stock are left out of the POS and the member menu.

### 4.8 Receipts and expenses
- **Scan a supplier receipt:** AI (with `ANTHROPIC_API_KEY`) or the free in-browser reader (English and Indonesian); supplier, phone, date, lines, total; says goods or expense.
- **Learns:** receipt memory (which item each printed line is, pack sizes, supplier kind) and supplier memory (address, phone, kind, usual lines): first time typed by hand, next time filled in.
- **Expenses page** (every staff account by default, hideable): kind, amount, receipt date, payee, photo, running cost it settles; **Food & drinks adds to stock** (new items are created hidden from the POS and shown as NEW); **paid or not paid yet** with credit terms (default 30 days) and an unpaid list with overdue; **cash or card** on every paid bill; **edit** (uploader 24 hours, managers any time) and **move to stock**; void with a reason; the list also shows recent uploads dated in other months and stock deliveries.

### 4.9 Accounting, payroll, staff
- **Accounting:** ledger of income and costs; reports in four groups (Items, Staff, Utilities, Company expenses) with every line clickable down to the bill or upload; running costs (rent, electricity, salary and others) with daily target and "sales needed"; start again from inventory (with backup); top-ups are not income.
- **Payroll:** per-country statutory rules (Singapore CPF by age band, Indonesia BPJS, Malaysia EPF, SOCSO, EIS), staff profiles (residency, birth date), pay by month with gross, staff share withheld, employer share booked; leave, MC and absence deductions; deposits; deductions and charges (damage, at-cost) taken from pay; item commission added to commission; police and security money; security guards with fixed shifts; payday reminder.
- **Payslips** (PDF, e-mailed, in the app); **employment contracts** (staff upload ID, admin sends, staff signs, admin approves, PDF e-mailed; the AI tidies the job scope); **schedule** (several people, several dates, per-day hours); **attendance** and leave.
- Staff real name used across the system; job scopes saved per job.

### 4.10 Referral, discounts and commission
- **Referral:** sign-up with a code links the member; commission on venue bills as RP credits on the eligible part (not promo-priced lines, packages, free units, items ticked off); **hold** hours before a new referral earns; refund takes it back.
- **App-order discount** (% set by the admin; per-item tick; not on promo lines, staff price or at cost).
- **Staff commission on items (ladies drinks):** rule per item (% or fixed), optional list of the staff who may earn it, picked on the bill line, into Payroll, cancelled by a refund.
- **Bill commission** (agents, drivers), **Happy hour** and its group on the order menu.

### 4.11 Venue equipment and venue server
- **LED lights** (Bluetooth: ELK-BLEDOM families, LED BLE, Triones, LEDDMX): power, colour, brightness, quick and saved colours, five effects, built-in effects and music mode, groups, retry for lights not linked, "did not get the last colour". Works in Chrome and inside the phone app (needs a new app build).
- **TV screens:** overlay, queue board, gifts wall; link by code or address; gifts on top of the karaoke picture through overlay apps (**not yet run on the real box**).
- **Cameras:** addresses, scan a QR, Find nearby (PC or phone scan); no face or plate recognition by design. **Officer at the door** check (paper and a call, not a camera).
- **Venue server:** the app on a PC with its own Postgres, syncing with the cloud, running when the internet is down; download from POS and Settings.
- **PC copy** on the live database (`STANDBY_MODE`, background jobs off) running all day; **Render standby** built (`render.yaml`), not used (you said not yet).

### 4.12 BridgeX
- Console, companies, data modes, per-company logins and cookies, resolving a request to its company, white label, App functions, industries, country and money, payroll rules per country, WhatsApp per company, **BridgeXPOS homepage** (3D logo, three languages, demo video), brand-swapped texts and page heads, merchant applications, plans.
- See section 3.1 and the isolation rules in section 6.

### 4.13 Security, backup and keys
- **Hardening after the Railway breach (21 Oct 2026):** safe headers, **Content-Security-Policy** (enforced; `CSP_MODE=report-only` or `off`), trusted proxy, login and sign-up limits, random session secret, secure cookies, bcrypt main-admin password, test routes and hard-coded user removed, signed Meta webhooks, dependencies upgraded (audit 26 to 7; the rest is the Tailwind 3 build chain).
- **Encrypted nightly backup** (AES-256-GCM, verified, newest 30 kept) and restore; setup script asks the passphrase on the PC.
- **Keys saved in the website** (Admin › Settings › Keys): Anthropic, OpenAI, Resend, SendGrid, WhatsApp, Expo, Spotify; encrypted in the database; password to change.
- **Error watch** (Admin › Errors) with alerts; failed calls answered instead of hanging; database pools hardened; real cause logged.
- **Reset all numbers** (main admin, password) keeps users, items, history.

---

## 5. Your ideas and their status

Kept in the format of `toolbox/templates/idea-log.md` (rule T9). Add every new idea here when it is given.

| Idea | Status |
|---|---|
| Receipt scan that fills in the data; free reader | Built |
| Same supplier recognised next time; new supplier typed first | Built (supplier and receipt memory) |
| Expenses page for staff, auto-fill, staff cannot see accounts | Built |
| Food and drinks go to stock, new items added to products, staff can tell new from old | Built |
| Paid or not paid yet, 30-day terms; cash or card | Built |
| Edit an expense; move it to stock | Built |
| Expenses saved but not shown | Fixed (recent and stock lists, jump to month) |
| Tax and service fee choices, cashier override | Built |
| Bills not paid at closing, carried to the next day | Built |
| Karaoke: load songs ahead, fair turns per table | Built; **not run on the real box** |
| Referral commission with an 18-hour hold | Built |
| App-order discount, with per-item tick (also bundles) | Built |
| Referral per-item tick (also bundles) | Built |
| Happy hour drinks in the order menu; by weekday; per item | Built |
| Ladies-drink commission to chosen staff, amount set by admin | Built |
| PC copy running all the time on live data | Built and running |
| Move to Render | **Not now** (you decided); standby is ready |
| Security hardening, CSP, encrypted nightly backup, version upgrades | Built; backup needs you to run the setup |
| Keys settable in the website | Built (Stripe, Twilio, VAPID not yet) |
| Do not rotate the Postgres password | Respected |
| One playbook of everything | This document |
| A toolbox folder with every file, an approval script, templates and docs, each pointed to by a playbook rule | Built (`toolbox/`, rules T1 to T12); not yet committed or pushed |
| A done checklist, and check my own work against it before showing anything | Built (section 8, `done-checklist.md`, rule T11) |
| When the app shows an error, an agent monitors it and prompts a fix | Built (scheduled `error-watch` agent, rule T12). It prepares the fix on its own branch and asks the owner; it never pushes. |

---

## 6. The rules

**Never**
- Rotate the Postgres password or move hosts without you asking.
- Print, log, commit or paste a password, key, token or the database address.
- Test on ports 54329 / 3999 or the live database (test users leaked once).
- Commit in the main repo folder `reborn-hero`.
- Overwrite `server/security.ts` (officer check and cameras); hardening is `server/webSecurity.ts`.
- Add a route that changes data without a login or role guard, trust an id from the request, or pass request data to `sql.raw`.
- Ship English-only text, or write "RP " by hand (use `money()`).
- Write `public.` in a query or read `platformDb` from member-app code.
- Create the backup task or type its passphrase for you.

**Always**
- Read the real data before changing anything; read-only on live; back up what a live fix changes.
- Build for all companies; key caches by company; timers once per company (`inEveryDataSpace`).
- One booking per money event; a refund reverses everything the sale did (stock, credits, referral, commission, item commission).
- Free units earn nothing; fixed amounts never exceed what the line was paid.
- Run the build before every push; a push to `main` is a deploy to every company.
- Use a trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` on commits.
- Tell the truth about testing: say what was not checked.

**For staff**
- One open bill per table; tag the member before paying with credits or packages; never delete a mistake (Remove before it is made, Lost after, refund after payment); nothing stays open at closing without a name; lowering a price is for managers.

**For hardware and devices**
- Phones run no browser feature newer than the Windows 7 POS terminal's Chrome 109; the offline server pack needs Windows 10 or 11.

### Toolbox rules (T1 to T12)

The toolbox is `toolbox/` in the working copy, with a copy in `OneDrive\Documents\Reborn-Wave-Toolbox`. Index with every file: `toolbox/README.md`. A step is not done until the tool for it has been used.

| Rule | When | Use this | What "used" means |
|---|---|---|---|
| **T1. Approve before you push.** | Before every push to `main` | `node toolbox/scripts/approve-change.mjs` (`--quick` while working, full before the push; `--report file` to keep the result). Commit with `toolbox/templates/commit-message.template.txt` (it carries the required trailer). | The result says APPROVED TO PUSH. It checks: not the main repo folder, no secrets in the change, saved keys read with `secret(NAME)`, new texts in three languages, query rules, a `CLAUDE.md` note and a test in the change, no test aimed at the live system, the commit trailer, the build and every unit test. NOT APPROVED means no push. It never pushes itself. Its own tests: `node --test toolbox/scripts/approve-change.test.mjs` (`toolbox/scripts/approve-change.test.mjs`). |
| **T2. Test on spare ports.** | Every code change | `bash toolbox/scripts/run-tests.sh [script names]`. New tests start from `toolbox/templates/unit-test.template.ts` and `toolbox/templates/e2e-test.template.mjs`. | Build, all unit tests and the named end-to-end scripts plus the rate-limit run pass, and the log ends with `E2E-DONE`. |
| **T3. Update the PC copy after a push.** | After every push that changes the app | `powershell -ExecutionPolicy Bypass -File toolbox\scripts\update-pc-copy.ps1` (add `-WithModules` after a dependency change). | The script prints `UP` (the PC copy answers on port 3999). |
| **T4. Read the errors before guessing.** | Any "it shows an error" or "something is wrong" in the POS or app | `node toolbox/scripts/errors-report.mjs [days] [area]` (read-only). | The cause is named from the grouped log, including the ones that are only network drops. |
| **T5. Probe for missing guards.** | After adding or changing any route, and after a security notice | `bash toolbox/scripts/route-probe.sh` | No route that changes or reveals data answers without a login. |
| **T6. Check the browser for CSP violations.** | After changing the security policy or adding a page that loads from another host | `bash toolbox/scripts/csp-check-server.sh`, then open the pages in the browser pane and read the console. | No violation on login, admin, POS, songs, the 3D homepage, BridgeX page and the receipt reader; a foreign script is blocked. |
| **T7. Prove the backup.** | After any change to the backup tools, and once on the real nightly file | `bash toolbox/scripts/backup-test.sh`; the real backup is set up with `scripts\backup\setup-nightly.ps1`. Tools: `toolbox/scripts/backup/`. | `PASS all tables identical`, a wrong passphrase and a changed file are refused; the nightly log shows `BACKUP OK`. |
| **T8. Write the request down and report it.** | Every owner request | Start from `toolbox/templates/change-request.md`; finish with `toolbox/templates/change-report.md` (attach the approval result). | The report says what was wrong, what changed, what was tested, what was **not** tested, the state (commit, pushed, PC copy, live confirmed), what only the owner can do, what is still open. |
| **T9. Use the checklist for the job.** | A new item, a new company, closing the night, an incident, a new owner idea | `item-setup.md`, `new-company.md`, `end-of-night.md`, `incident.md`, `idea-log.md` in `toolbox/templates/`. | The filled copy is kept; every box is ticked or has a reason. Owner ideas are logged with a status (section 5 follows `idea-log.md`). |
| **T10. Keep the toolbox whole.** | Every time a tool, script, template or doc is made or changed | Put it in `toolbox/` (never leave a reusable tool in a scratch folder), add it to `toolbox/README.md` and to this table, then run `bash toolbox/scripts/sync-toolbox.sh`. | The README lists the file, the rule here points to it, and the OneDrive copy is current. Nothing holding a password, token or the database address is saved in it. |
| **T11. Check your own work against the done checklist before showing anything.** | End of every app task, before the report | Fill in `toolbox/templates/done-checklist.md` (the same D1 to D19 as section 8). | Every line is Yes, No or N/A with evidence; no "No" is called done; the filled copy is shown to the owner with the report (T8). |
| **T12. Let the error-watch agent monitor the app.** | Always on (hourly while the desktop app is open); also by hand after a deploy | The scheduled task `error-watch` runs `node toolbox/scripts/error-watch.mjs` (sorting tested by `toolbox/scripts/error-watch.test.mjs`); its instructions are `toolbox/templates/error-watch-agent-prompt.md`. | Nothing new = silent. New errors = a brief in `OneDrive\Documents\Reborn-Wave-Error-Briefs\`, grouped as: needs the owner (a token only the owner can replace), needs a fix (code), watch, infra / external, noise. For a code problem the agent finds the cause, fixes it on its own branch in its own worktree, runs T1 and T2, writes a change report and done checklist, and notifies the owner. **It never pushes, never updates the PC copy and never writes to the live database: the owner approves.** |

Reference files in the toolbox, each named here so none is orphaned: `toolbox/docs/owner-actions.md` (what only the owner can do, section 9); `toolbox/docs/SECURITY.md` (hardening and the rotation order, used by T9 incident.md); `toolbox/docs/CLAUDE-notes-snapshot.md` (snapshot of the project notes; the live file is `CLAUDE.md`, refreshed by T10); `toolbox/docs/RENDER_STANDBY.md` (the Render standby, not in use); `toolbox/docs/BRIDGEXPOS_ARCHITECTURE.md` (BridgeXPOS architecture); `toolbox/docs/e2e-README.md` (how end-to-end scripts run, used with T2); `toolbox/docs/venue-README.md` (the venue server). Helper files used by the scripts above: `toolbox/scripts/probe.cjs` (called by `route-probe.sh`, T5) and `toolbox/scripts/backup/backup.mjs` + `backup-format.mjs` (the encrypted backup, called by `backup-test.sh`, T7; source of truth is `scripts/backup/` in the repo). The four playbooks are edited in `toolbox/playbooks/` (`MASTER-PLAYBOOK.md`, `PLAYBOOK.md`, `POS-PLAYBOOK.md`, `BRIDGEX-PLAYBOOK.md`); that is their only home.

---

## 7. Runbooks

**After a leak.** Open a copy of `toolbox/templates/incident.md` (rule T9) and follow `SECURITY.md` in order: database password (only when you decide), `SESSION_SECRET`, delete `ZENSEE_RESET_*`, API keys, Meta and WhatsApp tokens, tokens saved in admin screens, admin and manager passwords; then read Admin › Logs and Errors.

**A POS error.** The error-watch agent reports new ones by itself (rule T12); to look yourself: Admin › Errors, or `toolbox/scripts/errors-report.mjs` (rule T4), grouped by path and message. Network drops (`status 0`, "Failed to fetch") are not code bugs. "Staff only" is a non-staff login. "Order not open" is a stale screen. Anything else: find the route and fix the cause.

**"Saved but I cannot see it."** Check the date it was saved under, the month filter, who is viewing (staff see their own), and whether it is another record type.

**Restore a backup** (prove the method first with `toolbox/scripts/backup-test.sh`, rule T7). `node scripts/backup/restore.mjs <file.rbk>` with `BACKUP_PASSPHRASE_FILE` and `TARGET_DB_URL_FILE`, into a database whose tables exist; it refuses a database with rows unless `RESTORE_REPLACE=1`. Try on a scratch database first.

**CSP blocks something.** Use `toolbox/scripts/csp-check-server.sh` (rule T6) or `CSP_MODE=report-only`, read the console, add only the host the page needs to `contentSecurityPolicy()`, switch back.

**A company sees the wrong thing.** Wrong text: written outside `t()` / `tr()` / `pick()`. Data crossing: a query used `public.` or `platformDb`, or a cache not keyed by company; run `scripts/tenant-isolation-test.mts`. Wrong WhatsApp: check its page / phone ID and `forgetMetaRoutes()`.

**The PC copy.** Update with `toolbox/scripts/update-pc-copy.ps1` (rule T3); by hand: stop `RebornStandby`, free 3999, copy `dist` (and `node_modules`, `package.json` after dependency changes), start; it takes a few minutes over the slow line.

**Internet down at the venue.** Quick sale only (cash or card); the queue sends later; table bills, member lookup, credits and packages need the internet.

---

## 8. What "done" looks like

### Done checklist for an app task (D1 to D19)

An app task is any change to the system: a fix, a feature, a setting, a screen. The fillable copy is `toolbox/templates/done-checklist.md` (rule T11). **It is done only when no line is "No".**

| # | Done means | Proof |
|---|---|---|
| **A. Understood** | | |
| D1 | The owner's words, my reading of them and who is affected are written down | `change-request.md` filled in |
| D2 | The cause was found in the real data (read-only), not guessed; what cannot be fixed from here is named | The query or screen and what it showed |
| **B. Built** | | |
| D3 | The smallest change that fixes the cause, built for every company (no `public.`, no `platformDb` in member code, caches keyed by company) | The diff; approval script query rules |
| D4 | Every visible text exists in English, 中文 and Bahasa Indonesia | Approval script "New texts" check |
| D5 | Money is right: one booking per event, a refund reverses everything the sale did, free units earn nothing, per-item ticks respected | The end-to-end script's money and refund checks |
| D6 | Safe: login or role guard on every new route, acts for the logged-in user, no secrets in the change, saved keys read with `secret(NAME)` | Approval script; `route-probe.sh` after a route change (T5) |
| **C. Proven** | | |
| D7 | A unit test covers the rule and passes | `npx tsx --test <file>` |
| D8 | An end-to-end script covers the flow, including the refusals (wrong role, wrong person, empty input) | `scripts/e2e/<name>.mjs` |
| D9 | The whole suite passes: build, all unit tests, the end-to-end scripts, the rate-limit run | `run-tests.sh` ends with `E2E-DONE` and no FAIL (T2) |
| D10 | A visual change was looked at on screen (phone size when it matters), or the report says it was not | Screenshot or console read |
| **D. Recorded** | | |
| D11 | The note is in `CLAUDE.md` (and `SECURITY.md` for anything about safety) | Approval script "Note in CLAUDE.md" |
| D12 | Any new tool, script, template or doc is in `toolbox/`, listed in its README and in this playbook, and the OneDrive copy is current | Approval script "Toolbox is whole (T10)"; `sync-toolbox.sh` |
| D13 | A new owner idea is in the idea log with its status | Section 5 / `idea-log.md` |
| **E. Shipped** | | |
| D14 | The approval script says APPROVED TO PUSH (the full run, not `--quick`) | `approve-change.mjs` (T1) |
| D15 | Built, committed with the trailer, pushed to `main` | `git log -1`, the push output |
| D16 | The PC copy runs the new build and answers | `update-pc-copy.ps1` prints `UP` (T3) |
| D17 | The live site runs it, or the report says the live deploy is unconfirmed | Railway status (needs `railway login`) or the live page |
| **F. Reported** | | |
| D18 | The report says what was wrong, what changed, where to find it, what was tested, what was **not** tested, the state, what only the owner can do, what is still open | `change-report.md` (T8) |
| D19 | Nothing in the report claims more than the proof shows ("works" only where it was run) | Read the report line by line against this table |

**Self-check before showing anything (rule T11).** Fill in `done-checklist.md` for the task, line by line, with evidence. Fix every "No" that can be fixed. Whatever is still "No" goes into the report as not finished, in the first lines. The owner is shown the filled checklist with the report.

Other checklists by job: a night (`end-of-night.md`), a company (`new-company.md`), an item (`item-setup.md`), an incident (`incident.md`), all rule T9.


**A change is done when** every line of the done checklist above is Yes or N/A, in short:
- [ ] It answers the owner's words where they look for it, and the cause was found in the data.
- [ ] Texts exist in English, 中文 and Bahasa Indonesia.
- [ ] Unit and end-to-end tests cover it; the whole suite passes (build, unit, e2e, rate-limit).
- [ ] Visual changes were checked in the browser.
- [ ] `CLAUDE.md` (and `SECURITY.md`) have the note.
- [ ] `approve-change.mjs` says APPROVED TO PUSH (T1); built, committed, pushed; the PC copy runs it and answers (T3).
- [ ] The report (T8) states what was and was not tested and what depends on you.
- [ ] Any new tool, script, template or doc is in `toolbox/`, listed in its README and in section 6 (T10).

**A night is done when**
- [ ] `toolbox/templates/end-of-night.md` filled in (T9).
- [ ] No open bills except named on-account ones; the POS day is closed and the report printed.
- [ ] Cash and card match the drawer and the terminal.
- [ ] No ready items uncollected, no service calls open, the offline queue is empty.
- [ ] The day's receipts and expenses are uploaded; unpaid bills have due dates.
- [ ] Admin › Errors has nothing new except network drops.

**A company is live when**
- [ ] Right country, currency, industry, slug and data mode; brand, functions and industries set.
- [ ] Admin logs in; staff have roles; tables, tax, fee, receipt and payroll rules are set.
- [ ] Products and stock are loaded; WhatsApp answers from its own number.
- [ ] A test day passed; nothing of Reborn shows in its screens, receipts, messages or emails.

**The whole programme is done when**
- [ ] The nightly backup runs and one restore has been tried.
- [ ] Every key is in the website or the host, none in the repository or chat; the leaked ones are rotated by you.
- [ ] Railway deploys are confirmed live.
- [ ] The isolation test passes; every timer runs once per company.
- [ ] No unexplained errors for a week.
- [ ] Section 9 is closed or decided against.

---

## 9. Open items and what only you can do

The full list with tick boxes is `toolbox/docs/owner-actions.md`.

**Only you can**
- Run `scripts\backup\setup-nightly.ps1` (types the passphrase on your PC) and keep the passphrase on paper.
- Run `railway login` so deploys can be checked.
- Rotate the other leaked secrets (API keys, tokens) and set 2-step login on Railway, GitHub, Meta and Google.
- Decide about Render when you are ready.
- Tick the happy hour weekdays, per-item discount and referral ticks, and staff commission rules on your items.

**Not built or not proven**
- Two-step login for admin accounts.
- Stripe, Twilio and VAPID keys in the Keys screen.
- Tailwind 4 move (needs a visual check, separate job).
- Staff commission rule on bundles and packages.
- Never run on real equipment: karaoke "load ahead", gift overlay apps on the box, the phone app's Bluetooth and Wi-Fi scan code, the Windows POS app with the real printer, LED light styles against real lights, pending Railway deploy confirmation.
- Customers ordering from the customer screen is not built.
