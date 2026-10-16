# End-to-end checks on a real Postgres (no cloud needed)

These scripts start the whole server against a throw-away local Postgres and exercise the API as an admin, a staff member and a member.
They are what proved the POS / kitchen / bundle / payslip / schedule / contract code on a real database.

```bash
npm i --no-save embedded-postgres            # a real Postgres that needs no installation (Windows / Mac / Linux)
node scripts/e2e/start-test-db.mjs &         # UTF-8 database on port 54329 (data in ./.test-db)
DATABASE_URL=postgres://postgres:pw@127.0.0.1:54329/reborn npx drizzle-kit push --force
npm run build
DATABASE_URL=postgres://postgres:pw@127.0.0.1:54329/reborn SESSION_SECRET=test PORT=3999 NODE_ENV=production node dist/index.js &
node scripts/e2e/00-create-admin.mjs         # admin@test.local / Passw0rd!
node scripts/e2e/pos-kitchen.mjs             # bundles, offline-sale ids, kitchen claim, stock, refunds
node scripts/e2e/staff-payroll-schedule.mjs  # staff lists, real names, rating, payslips, schedule, contract + ID
```

Notes: the database must be UTF-8 (`initdbFlags` in start-test-db.mjs) and `ALTER DATABASE reborn SET client_encoding='UTF8'` avoids Windows code-page errors.
The scripts add rows (products, a staff member…) — start from an empty database each time.

## Venue server (two servers + two databases)
`venue-token.mjs` makes the token on a running cloud server; `venue-sync.mjs` then checks the replication while both servers run (cloud on 3999 with its own
Postgres, venue on 4000 with `VENUE_MODE=1 CLOUD_URL=… VENUE_SYNC_TOKEN=…` and a second empty Postgres on 54330). `venue-offline-part1.mjs` (stop the cloud first) and
`venue-offline-part2.mjs` (cloud back) check an outage. See venue/README.md for the real install.
