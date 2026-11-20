// What a view-only partner admin may still send. The member app works as for any member (songs, KOS gifts, games, bookings, shop, wallet);
// every change in the admin / POS / staff areas is refused, and so is anything outside the member app that is not listed below.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Sign out, report a broken page, register the phone for notifications, change the own profile.
const ALLOWED_WRITES = ["/api/auth/logout", "/api/client-error", "/api/v1/app/device-tokens", "/api/reborn/profile"];
// Admin, POS, staff, expenses, kitchen, security and manager calls, and the venue's staff-side service-call / table calls.
const ADMIN_AREA = /^\/api\/reborn\/(admin|pos|staff|expenses|kitchen|security|manager)(\/|$)|^\/api\/reborn\/venue\/(service-calls|tables)(\/|$)/;
// Member-app calls that live outside /api/reborn/.
const MEMBER_PREFIXES_OUTSIDE_REBORN = ["/api/pets", "/api/redeem-reward", "/api/users/apply-referral", "/api/transactions/top-up", "/api/topup", "/api/toys", "/api/purchase-random-toy", "/api/listings"];

const isMemberCall = (path: string): boolean =>
  path.startsWith("/api/reborn/") ? !ADMIN_AREA.test(path) : MEMBER_PREFIXES_OUTSIDE_REBORN.some((prefix) => path === prefix || path.startsWith(prefix + "/"));

export const isWriteForbiddenToPartner = (method: string, path: string): boolean =>
  !READ_METHODS.has(method.toUpperCase()) && !ALLOWED_WRITES.includes(path) && !isMemberCall(path);
