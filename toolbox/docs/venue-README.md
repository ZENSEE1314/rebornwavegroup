# Venue server — the app on the venue's own PC (works with no internet)

The POS PC runs the whole app and its own database. Guests join the venue Wi-Fi, scan a QR code and use the same app (songs, orders, KOS,
member login). The POS, kitchen screen and song queue all work with the internet down. While the internet is up, everything is copied both
ways every ~10 seconds; after an outage the changes that waited are sent by themselves, each exactly once.

**This PC is the main copy while the venue is open** (the cloud is the backup and the remote view). Staff work on this PC's address.

## What stays in the cloud
WhatsApp / Messenger bots, reminders, daily pet tokens and tournaments run in the cloud only (the venue PC leaves them alone). Sending a
WhatsApp / push / e-mail from the venue PC needs internet and just waits or fails quietly when there is none.

## 0. The easy way: the download (nothing to install)
`node venue/pack.mjs` (on a Windows PC, from the project folder) makes **RebornVenue-windows.zip** (Node, the built app and the local database engine inside).
At the venue: unzip it anywhere (e.g. `C:\RebornVenue`), double-click **Start Reborn Venue.bat**, paste the token on the page that opens, wait for the first copy,
then run **Start automatically with Windows (run as administrator).bat** once. `config.json` and the `data` folder next to it are kept when a newer download is unzipped over it.
The rest of this guide (router, limits) applies the same way.

## 1. Install from the project folder (developer way)
1. Install **Node.js 20+** (nodejs.org) and **Git**.
2. `git clone <the project>` then in its folder: `npm install` and `npm run build`.
3. In the cloud site: **Admin › Settings › Venue server › Turn on** → copy the **token**.
4. In the `venue` folder double-click `start-venue.bat`. The first time it makes `config.json`; open it, paste the token (and check `cloudUrl`),
   save, run `start-venue.bat` again. It creates its own database, copies all the cloud data (a few minutes) and prints the addresses:
   - Guests: `http://<this PC's IP>:3000/` — and **`/venue`** is a page with the QR code to print for the tables.
   - This PC: `http://localhost:3000/`
5. Log in with your normal admin account (same email and password as the cloud). Admin › Settings › **Venue server** shows "Connected to the cloud".
6. To start with Windows: PowerShell **as Administrator** in the `venue` folder → `./install-autostart.ps1` (also opens the firewall port and stops the PC sleeping).

## 2. Router (you set this up)
1. **Fixed address for the PC:** in the router, reserve one IP for this PC (DHCP reservation), e.g. `192.168.1.50`.
2. **Guest Wi-Fi with no internet:** make a separate guest SSID that has *no internet access* (options named "No internet", "Local network only", a
   VLAN without a gateway, or block it from the WAN in the firewall). The PC itself keeps its internet through the normal LAN / cable.
3. **Guests must reach the PC:** turn OFF "client / AP isolation" for that SSID (isolation stops phones talking to the PC). Allow only the PC's IP and
   port 3000 if you want to keep guests away from other devices.
4. *(Optional)* a friendly name: add a static DNS entry `pos.reborn` → the PC's IP in the router, then print `http://pos.reborn:3000/`.
   Without it, the QR code on `/venue` already holds the IP address.
5. Test: a phone on the guest Wi-Fi opens `http://192.168.1.50:3000/venue`.

## 3. Good to know
- **Guests log in with their email + password.** A member who only ever used Google / Facebook has no password: they set one in Profile while online first.
- Guests open a plain `http://` address: the phone's camera app scans the table QR as usual, but in-page camera / Bluetooth / install-as-app / push
  are not available there. Staff can use `http://localhost:3000/` on the PC itself for those.
- If the venue PC is switched off, the cloud app still works for phones on mobile data (nothing is lost; the PC catches up when it is back).
- After more than 30 days apart, the cloud no longer holds the history the PC needs: ask the developer for a fresh copy.
- Updating the app: stop the launcher, `git pull`, `npm install`, `npm run build`, then `npx drizzle-kit push` (answer the question if it asks), start again.
- Problems the sync could not apply (for example the same email taken on both sides) are shown as "N changes could not be applied" in Admin › Settings › Venue server.
- Test everything with no internet before opening night: unplug the PC's internet and make a sale, a table order and a song request.
