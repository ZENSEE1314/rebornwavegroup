// The venue server: the same app run on a PC in the venue (own local database), so songs, POS and the member app work on the venue's own
// Wi-Fi with no internet. It is the main copy while the venue is open; the cloud copy is kept in step by server/venueSync/.
export const VENUE_MODE = process.env.VENUE_MODE === "1";
export const CLOUD_URL = (process.env.CLOUD_URL || "").replace(/\/+$/, "");
export const VENUE_SYNC_TOKEN = process.env.VENUE_SYNC_TOKEN || "";
