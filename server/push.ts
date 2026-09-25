import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions, users } from "@shared/schema";

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@rebornwave.group";

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  } catch (e: any) {
    console.warn("VAPID keys invalid — push notifications disabled:", e?.message);
  }
} else {
  console.log("VAPID keys not set — push notifications disabled");
}

export function pushEnabled(): boolean { return configured; }
export function getVapidPublicKey(): string { return PUBLIC_KEY; }

export async function savePushSubscription(userId: string, sub: any, userAgent?: string) {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error("Invalid subscription");
  // One endpoint = one device. Re-subscribing updates the owner + keys.
  await db.insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth, userAgent: userAgent || null })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth, userAgent: userAgent || null } });
}

export async function removePushSubscription(endpoint: string) {
  if (!endpoint) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export interface PushPayload { title: string; body: string; url?: string; tag?: string; }

async function deliver(rows: { endpoint: string; p256dh: string; auth: string }[], payload: PushPayload) {
  if (!configured || !rows.length) return 0;
  const data = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || "/", tag: payload.tag });
  let sent = 0;
  await Promise.all(rows.map(async (r) => {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, data);
      sent++;
    } catch (e: any) {
      // 404/410 = subscription gone; prune it so we stop trying.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, r.endpoint)).catch(() => {});
      }
    }
  }));
  return sent;
}

export async function sendPushToUser(userId: string | null | undefined, payload: PushPayload) {
  if (!configured || !userId) return 0;
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  return deliver(rows, payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!configured || !userIds.length) return 0;
  const rows = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  return deliver(rows, payload);
}

export async function sendPushToAdmins(payload: PushPayload) {
  if (!configured) return 0;
  const admins = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["staff", "admin"]));
  return sendPushToUsers(admins.map((a) => a.id), payload);
}
