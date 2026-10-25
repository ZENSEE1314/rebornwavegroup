# Standby copy of the server on Render

Use this when Railway cannot deploy (an outage) and the new version has to be usable. The standby runs the same code as `main` against the **same live database**.
The main website (rebornwave.group) is not touched; the standby has its own address (`https://reborn-standby.onrender.com`, or the name Render gives it).

## What it does and does not do
- Same app, same data: the POS, admin, accounts, members. A bill made on one address shows on the other.
- `STANDBY_MODE=1` switches off the background jobs (reminders, pet decay, daily tokens, tournaments, WhatsApp Web, supplier and payroll reminders, service-call alerts).
  The main server keeps doing those, so nothing is sent or counted twice. While the main server is down nobody runs them: that is expected.
- People log in again on the standby address (it has its own cookies and its own secret).
- WhatsApp, Meta and push messages still go to the main address, not to the standby.
- It adds the new database columns when it starts (additive only, safe for the old version).

## Set up once (about 10 minutes, in the Render dashboard)
1. Create / sign in to a Render account and add a payment method (the Starter plan is a few dollars a month; the standby can be suspended afterwards).
2. New + › **Blueprint** › connect the GitHub repository `ZENSEE1314/rebornwavegroup`, branch `main`. Render reads `render.yaml`.
3. When asked for `DATABASE_URL`, paste the live database's **public** address
   (`postgresql://postgres:<password>@<railway-proxy-host>:<port>/railway`). Never put it in the repository.
4. Create the service. The first build takes 8–12 minutes. When it says Live, open the address and log in as an admin.
5. Check: Admin › Accounting shows the new "Tax and service fee" card, and the POS pay panel has the **Split** button.

## When Railway is back
1. Deploy `main` on Railway as usual.
2. In Render, **Suspend** the standby (Settings › Suspend Service) so two servers do not run for no reason. Delete it if you will not need it again.
3. Staff go back to rebornwave.group.

## Safety rules
- Do not set `VENUE_MODE` on the standby: it is for the venue PC and installs sync triggers on the database.
- Do not remove `STANDBY_MODE=1` while the main server is up.
- Keep `autoDeploy` off. A deploy button press is the only thing that updates the standby.
