# Security

## What the server does

- **Headers** (`server/webSecurity.ts`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security` on https, no `X-Powered-By`.
- **Content-Security-Policy** (`contentSecurityPolicy()`, on by default): scripts only from this site, inline (import maps, head scripts) and cdn.jsdelivr.net (3D pages, receipt reader); no plugins/objects, no changed base address, forms only to this site, not framed by other sites; pictures, video and calls stay open to http/https (member pictures, camera streams, the venue server on plain http). `CSP_MODE=report-only` shows violations in the browser console without blocking, `CSP_MODE=off` removes it. Checked in a real browser: login, admin, POS, songs, the 3D homepage, BridgeX page (three.js from the CDN) and the receipt reader (tesseract worker + wasm) load with no violations; a script from another site is blocked.
- **Trusted proxy**: `trust proxy` is set to the private address ranges of the host's proxies, so `req.ip` and `req.secure` are right behind Railway / Render / Cloudflare.
  The visitor's address is `cf-connecting-ip` when present (Cloudflare hides it from `req.ip`), else `req.ip` (`clientAddress`).
- **Login limits**: login 10 tries per account per 15 min (and 100 per address per 10 min), sign-up 5 per account / 60 per address per hour, forgot-password 5 per account / 20 per address per hour, plus reset-password, change-password, apply-referral and chat-login links.
  The account limits are what stop password guessing; the address limits are generous because the whole venue shares one address.
  `RATE_LIMIT_OFF=1` switches them off (tests only; the server prints a warning).
- **Sessions**: cookie `httpOnly`, `sameSite=lax`, `secure` automatically on https. `SESSION_SECRET` must be set on the host (16+ characters); without it a random secret is made for each run (everyone logs in again after a restart), never a fixed word.
- **Passwords**: members and staff use bcrypt. The main-admin password (reset buttons) is a bcrypt hash too (`server/adminSecret.ts`), is never sent to the browser, and a readable one from before is turned into a hash at start-up or on first use.
- **No hard-coded accounts or test routes**: routes that acted for a fixed user id or returned any user's record without a login were removed (`/api/test-login/:id`, `/api/test-*`, `/api/kos/purchase-stars-test`); the star / vote / like routes act for the logged-in user only; the manual token distribution is for admins.
- **SQL**: queries use Drizzle with parameters. `sql.raw` is only used with fixed text written in the code (column names, start-up SQL). Never pass request data to `sql.raw`, `sql.identifier` or a table name.
- **Dependencies**: `npm audit fix` is run after every security notice; drizzle-orm 0.45.4 and drizzle-kit 0.31.11 are in; what remains (7 findings) is the Tailwind 3 build chain, build-time only, which needs a visual-checked move to Tailwind 4.

## After a host or secret leak (for example Railway, 21 Oct 2026)

Treat every value that was stored on the host as known to the attacker. Rotate in this order (a new value first, then remove the old one):

1. The database password (the host's Postgres service): change the role password in the database, update `DATABASE_URL` on every server that uses it (the host, the PC copy at `C:\RebornStandby\database-url.txt`, any Render service), then redeploy.
2. `SESSION_SECRET` (everyone is logged out once).
3. Delete `ZENSEE_RESET_EMAIL` / `ZENSEE_RESET_PASSWORD` from the host (`server/routes.ts` resets that account's password at start-up when they are set).
4. API keys that are set: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY` / `SENDGRID_API_KEY`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`, `SPOTIFY_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`, `APPLE_PRIVATE_KEY`, `EXPO_ACCESS_TOKEN`, `SEO_WEBHOOK_API_KEY`.
5. Meta / WhatsApp: `META_APP_SECRET`, `WHATSAPP_TOKEN` (and the `waToken` saved in Admin › CRM: make a new system-user token and save it), `WHATSAPP_VERIFY_TOKEN` / `waVerifyToken` (also change it in Meta's webhook settings).
6. Secrets saved in the database (Admin screens): the karaoke token (Admin › Requests › Karaoke system), the venue bridge token (Security / TV scan), the venue sync token (Admin › Settings › Venue server: turn off and on again; then paste the new one on the venue PC), the main-admin password (Admin › Settings › Main-admin security).
7. Passwords of every admin and manager account (and ask staff to change theirs): password hashes could have been read.
8. `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY`: rotating them makes every saved push subscription invalid (people allow notifications again). Only do it if the key was exposed.
9. Not rotated on purpose: `tableQrSecret` (every printed table QR would stop working) unless the database itself was read.

Then check Admin › Logs for logins or changes nobody recognises, and Admin › Errors for strange calls.

## Routine

- Encrypted nightly backup (`scripts/backup/`): `backup.mjs` copies every schema and table, gzips and encrypts it with AES-256-GCM (key from a passphrase via scrypt), checks the file by reading it back, and keeps the newest 30 in a folder (OneDrive). `restore.mjs <file>` puts it back into a database whose tables exist (refuses a database with rows unless `RESTORE_REPLACE=1`). `setup-nightly.ps1` asks for the passphrase on the PC and makes the 03:30 task `RebornNightlyBackup`. Keep the passphrase on paper too: a backup cannot be opened without it. Tested dump → restore → compare of 120 tables (counts + content hash), wrong passphrase and a changed file are refused.
- Use a different password for each service; turn on two-step login for Railway / Render / GitHub / Meta / Google.
- Never put keys in the repository, in a screenshot or in chat. Keep them only in the host's variable screen.
- A new route that reads or changes data needs `requireAuth` (or the role guard) and must use the logged-in user, never an id from the request or a fixed one.
