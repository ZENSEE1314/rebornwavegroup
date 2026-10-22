// The venue server: the same app run on a PC in the venue (own local database), so songs, POS and the member app work on the venue's own
// Wi-Fi with no internet. It is the main copy while the venue is open; the cloud copy is kept in step by server/venueSync/.
export const VENUE_MODE = process.env.VENUE_MODE === "1";
// A standby copy of the server (for example on Render while the main host is down) shares the live database but must not run the timers: reminders, pet decay, tournaments, WhatsApp Web.
// Unlike VENUE_MODE it does not touch the venue-sync triggers. The venue PC and a standby copy both leave the background jobs to the main server.
export const STANDBY_MODE = process.env.STANDBY_MODE === "1";
export const BACKGROUND_JOBS_OFF = VENUE_MODE || STANDBY_MODE;
export const CLOUD_URL = (process.env.CLOUD_URL || "").replace(/\/+$/, "");
export const VENUE_SYNC_TOKEN = process.env.VENUE_SYNC_TOKEN || "";
