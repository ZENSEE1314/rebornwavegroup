# What only the owner can do

These cannot be done by Claude, by the scripts or by staff. Tick them off; the master playbook section 9 points here.

## Do once
- [ ] **Backup:** run `powershell -ExecutionPolicy Bypass -File scripts\backup\setup-nightly.ps1` from the app folder. It asks for a passphrase (16+ characters) that only you type. Write the passphrase on paper: a backup cannot be opened without it and it cannot be recovered.
- [ ] After a night, run `Start-ScheduledTask RebornNightlyBackup` once and check `%LOCALAPPDATA%\RebornBackup\backup.log` shows `BACKUP OK`. Then try one restore on a scratch database (`toolbox/scripts/backup-test.sh` proves the method).
- [ ] **Railway:** run `railway login` so deploys can be checked.
- [ ] **Rotate the other leaked secrets** yourself (API keys, tokens; order in SECURITY.md). The Postgres password stays as you set it unless you decide otherwise.
- [ ] Turn on 2-step login on Railway, GitHub, Meta and Google.
- [ ] Save the keys in Admin › Settings › Keys (Anthropic, OpenAI, Resend, SendGrid, WhatsApp, Expo, Spotify) so they are not only host variables.

## Found by the error watch
- [ ] **WhatsApp access token is invalid** (Meta 401 "Invalid OAuth access token - Cannot parse access token", 58 failures in a week: reminders, feedback requests and service-call alerts did not reach anyone). Make a new system-user token in Meta and save it in Admin › CRM (or Settings › Keys › WHATSAPP_TOKEN). A real token starts with EAA and is 200+ characters; the one saved earlier was 32 characters (an App Secret).
- [ ] Read the error briefs the agent writes in `OneDrive\Documents\Reborn-Wave-Error-Briefs\` and say yes or no to each prepared fix.

## Set in the website (your decisions)
- [ ] Happy hour: windows, weekdays, price or 1+1, per item or many items.
- [ ] Per item: App-order discount tick and Referral tick (also on bundles and packages).
- [ ] Ladies drinks: staff commission rule per item and which staff may earn it.
- [ ] Tax and service fee, whether the cashier may change them for one bill.
- [ ] Referral: percent and hours before a new referral earns.
- [ ] App-order discount percent.
- [ ] Payroll: day of the month, staff profiles, statutory rates when governments change them.

## Decide
- [ ] Moving to Render: not now; the standby (`render.yaml`, RENDER_STANDBY.md) is ready when you are.
- [ ] Tailwind 4 move (a separate, visually checked job).
- [ ] Two-step login for admin accounts (not built).

## At the venue (equipment never run for real)
- [ ] Karaoke "load songs ahead": turn on while staff are there, off if the box misbehaves.
- [ ] Gift overlay on the karaoke box.
- [ ] A new phone app build for Bluetooth lights and Wi-Fi scan inside the app.
- [ ] Windows POS app with the real receipt printer and cash drawer.
- [ ] LED lights: try the command styles on the real lights.
