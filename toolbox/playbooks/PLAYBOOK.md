# Reborn Wave Group platform: playbook

How this system is run and changed, written from the October 2026 work (receipts and expenses, POS, happy hour, security hardening after the Railway breach, backups, saved keys, staff commission).

## 1. The task

Keep the Reborn Wave Group platform running and growing for the venue and for other companies on BridgeX:

- The member app, admin panel, POS, kitchen screen, karaoke bridge and WhatsApp bot, all on one server (Express, Drizzle, React/Vite).
- Each company other than Reborn has its own data space (Postgres schema `tenant_<id>`).
- Every request from the venue (a bill, an expense, a receipt) has to work, show up where staff look for it, and be safe.

Work comes in as short requests from the owner ("why is my Heineken missing", "set happy hour on some days", "ladies drink commission"). Each one is a small change that has to be found in the real data, fixed, tested and shipped without breaking the venue.

## 2. The goal

- The venue can trade every night: bills, stock, accounting, payroll and the song queue are correct.
- Money is right: nothing is double counted, refunds undo what they should, every number can be traced to a bill or an upload.
- The data is safe: after the Railway breach on 21 Oct 2026, assume every host variable was seen. Keep the attack surface small and keep an encrypted copy of the database off the host.
- The owner can run it without a developer: settings, keys, ticks and rates are set in the website, not in code or host variables.
- Staff see what they saved. If something looks "not saved", the system must show it or say why.

## 3. Where things are

| Thing | Where |
|---|---|
| Working copy (always use this) | `C:\Users\Zen See\AppData\Local\Temp\rw-song-wt` (a git worktree) |
| Deploy | `git push origin HEAD:main`, which the host builds. Railway builds can be slow or paused. |
| Main repo `...\OneDrive\Documents\reborn-hero` | Another session's uncommitted work lives there. Never commit in it. |
| PC copy | `C:\RebornStandby\app`, scheduled task `RebornStandby`, port 3999, runs on the live database. Start-up takes a few minutes over the slow line. |
| Live database address | In `C:\RebornStandby\database-url.txt` only. Never print it, commit it or paste it. |
| Test servers | Spare ports only: Postgres 54339, servers 3998 / 3997. Never 54329 or 3999 for tests. |
| Rules for the code | `CLAUDE.md` (one note per feature), `SECURITY.md` (hardening and what to rotate after a leak) |
| Errors | Admin › Errors (table `app_errors`, 30 days) |
| Backups | `scripts/backup/` and `%LOCALAPPDATA%\RebornBackup` on the PC |

## 4. The steps, in order

Do these for every request.

1. **Read the request as the owner means it.** Find the screen and the user (staff, manager, main admin). If a word could mean two things, pick the one the data supports and say which one you picked.
2. **Look at the real data before changing anything.** Read-only queries on the live database, using the URL file without printing it. Examples that paid off: the happy hour items had a deal but no price; the "missing" expenses were dated in earlier months; the POS errors were mostly network drops.
3. **Find the cause, not only the symptom.** Check Admin › Errors first for anything that "shows an error". Say what you found, including what you could not fix (a network drop, for example).
4. **Change the smallest thing that fixes the cause.** Match the surrounding code. No features nobody asked for.
5. **Texts in three languages.** Every visible text exists in English, 中文 and Bahasa Indonesia (`t()`, `tr()`, `pick()`, the WhatsApp `L()` table).
6. **Make it work for every company.** Store data through `db` / `appSettings`, not Reborn-only tables.
7. **Write the test.** A unit test for the rule (`npx tsx --test <file>`), and an end-to-end script in `scripts/e2e/` for the flow. Tests describe behaviour, one check each.
8. **Run everything on spare ports.** Build, unit tests, e2e. Include the rate-limit run on its own server. Fix what fails; never retry until it passes.
9. **Check the screen in the browser pane** when the change is something people see (security policy, 3D page, forms).
10. **Write the note** in `CLAUDE.md` (and `SECURITY.md` for anything about safety).
11. **Build, then commit, then push.** Always run the build before pushing: a comment inside an object literal once put a broken commit on main. Commit message ends with the `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` line.
12. **Update the PC copy.** Stop the task, free port 3999, copy `dist` (and `node_modules` + `package.json` when dependencies changed), start the task, wait until it answers.
13. **Report in plain words.** What was wrong, what changed, where the owner finds it, what was tested, what was not (for example "I did not click through the screen", "I have not checked the live deploy"), and what is still open.

## 5. The rules

**Never**
- Rotate the Postgres password without the owner asking. The owner chose to keep the one already set.
- Move the system to another host (Render) without the owner asking. They said not yet.
- Print, log, commit or paste a password, key, token or the database address. Keys go through the website's Keys screen or host files.
- Run tests against ports 54329 / 3999 or the venue database. Test users leaked into the live database once.
- Commit in the main repo folder (`reborn-hero`).
- Overwrite `server/security.ts` (it is the officer-check and cameras file; hardening is in `server/webSecurity.ts`).
- Add a route that changes data without `requireAuth` or a role guard, or that trusts an id from the request, or passes request data to `sql.raw`.
- Ship English-only text.
- Create the nightly backup task or store its passphrase for the owner. The owner runs `setup-nightly.ps1` and types it.

**Always**
- Reads of the live database are read-only. A fix to live data gets a backup file of what changed first.
- Money: one booking per event. Refunds reverse what the sale booked (stock, credits, commission, referral, item commission). Free units earn nothing.
- Per-item ticks decide discounts and commissions where an item must never get them (app discount, referral, staff commission).
- Use English file names in ASCII for seed data.
- A push to `main` is a deploy to the venue. Do not push a change you have not built and tested.

## 6. What has been built (so the next change fits)

**Security after the Railway breach (21 Oct 2026)**
- Response headers, Content-Security-Policy (enforced; `CSP_MODE=report-only` or `off` as a switch), trusted proxy, login / sign-up / password rate limits, random session secret, secure cookies.
- Main-admin password stored as a bcrypt hash. Test routes and the hard-coded user removed. Meta webhooks signature-checked.
- Dependencies upgraded (audit 26 → 7; the rest is the Tailwind 3 build chain, build-time only, needs a visual-checked move to Tailwind 4).
- Encrypted nightly backup and restore (AES-256-GCM, verified, 30 kept). `SECURITY.md` has the rotation order after any leak.
- Keys saved in the website (Admin › Settings › Keys): encrypted in the database, locked with `SESSION_SECRET` or `SECRETS_KEY`. Not yet covered: Stripe, Twilio, VAPID.
- Failed calls are answered (an async-handler fix) instead of hanging; database pools use keep-alive; the error log shows the real cause.

**Money and stock**
- Receipt reader (free in-browser OCR plus optional AI), supplier memory, Expenses page for staff (paid / unpaid with credit terms, cash or card, edit, move to stock), accounting reports in four groups.
- POS: tax and service fee per bill, bills kept on account, split payment, staff price, item edit.
- Referral: 18-hour hold, per-item tick. App-order discount: per-item tick. Happy hour: windows, price, buy-1-get-1, chosen weekdays, own group on the order menu.
- Staff commission on items (ladies drinks): rule per item, chosen staff per item, picked on the bill line, in Payroll, cancelled by a refund.

**Operations**
- PC copy runs all day on the live database (`STANDBY_MODE=1`, background jobs off, so nothing is sent twice).

## 7. Runbooks

**After any leak or breach.** Follow `SECURITY.md` in order: database password (only when the owner decides), `SESSION_SECRET`, delete `ZENSEE_RESET_*`, API keys, Meta and WhatsApp tokens, tokens saved in admin screens, admin and manager passwords. Then read Admin › Logs and Admin › Errors.

**A POS error.** Open Admin › Errors, group by path and message. Network drops (`status 0`, "Failed to fetch") are not code bugs. "Staff only" 403s are a non-staff login opening the POS. "Order not open" is a stale screen. Everything else: find the route and fix the cause.

**"It saved but I can't see it."** Check the date it was saved under, the month filter, who the viewer is (staff see only their own), and whether it is a different record type (stock deliveries are not expense rows).

**Restore from a backup.** `node scripts/backup/restore.mjs <file.rbk>` with `BACKUP_PASSPHRASE_FILE` and `TARGET_DB_URL_FILE`, into a database whose tables exist. It refuses a database with rows unless `RESTORE_REPLACE=1`. Try it on a scratch database first.

**CSP trouble.** Set `CSP_MODE=report-only`, reload the page, read the console for the blocked address, add it to `contentSecurityPolicy()` (only the hosts the page really needs), then set it back.

## 8. What "done" looks like

A change is done when all of this is true:

- [ ] The owner's words are answered: the thing they asked about now works where they look for it.
- [ ] The cause is found in the real data, not guessed.
- [ ] Texts exist in English, 中文 and Bahasa Indonesia.
- [ ] A unit test and an end-to-end test cover it, both pass, and the whole suite still passes (build, unit, e2e, rate-limit).
- [ ] The screen was checked in the browser when it is visual.
- [ ] `CLAUDE.md` (and `SECURITY.md` if about safety) has the note.
- [ ] Built, committed with the trailer, pushed to `main`.
- [ ] The PC copy runs the new build and answers.
- [ ] The report says what was tested, what was not, and what still depends on the owner (run the backup setup, `railway login`, pick the weekdays, tick the items).

The whole programme is done when:

- [ ] The nightly backup runs on the PC and one restore has been tried from it.
- [ ] Every key is saved in the website or the host, none in the repository or chat, and the leaked ones are rotated by the owner.
- [ ] Railway deploys are confirmed live (needs the owner's `railway login`).
- [ ] No unexplained entries in Admin › Errors for a week, apart from network drops.
- [ ] Open items below are closed or decided against.

## 9. Open items

- Admin-account two-step login (not built).
- Stripe, Twilio and VAPID keys are not in the Keys screen yet.
- Tailwind 4 move (visual-checked, separate job).
- Bundles and packages have no staff-commission rule of their own.
- Karaoke "load songs ahead" has not been run on the real box.
- Unconfirmed: that Railway has deployed the latest pushes.
