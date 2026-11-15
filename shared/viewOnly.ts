// What a view-only partner admin may still send. Everything that is not a read is refused, except the few calls below.
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Sign out, report a broken page, register the phone for notifications, change the own profile.
const ALLOWED_WRITES = ["/api/auth/logout", "/api/client-error", "/api/v1/app/device-tokens", "/api/reborn/profile"];

export const isWriteForbiddenToPartner = (method: string, path: string): boolean => !READ_METHODS.has(method.toUpperCase()) && !ALLOWED_WRITES.includes(path);
