// Protection of the web server itself: safe response headers, a trusted-proxy setting, a session secret that can never be a guessable default,
// and limits on how often one address or one account can try to log in, sign up or reset a password (a stolen-password or guessing attack needs many tries).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { tr } from "./i18n";

/** The proxies that sit in front of the app on a host (Railway, Render, Cloudflare reach it from private addresses). */
export const TRUSTED_PROXIES = "loopback, linklocal, uniquelocal";
const HSTS_MAX_AGE_SECONDS = 15_552_000; // 180 days
const MAX_TRACKED_KEYS = 20_000;
const MS_PER_MINUTE = 60_000;

let generatedSecret: string | null = null;
/** SESSION_SECRET from the host; without one a random secret is made for this run (people log in again after a restart) — never a fixed word an attacker could know. */
export function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (!generatedSecret) {
    generatedSecret = randomBytes(32).toString("hex");
    console.warn("[security] SESSION_SECRET is missing or shorter than 16 characters: using a random secret for this run. Set a long SESSION_SECRET on the host.");
  }
  return generatedSecret;
}

/** Counts tries per key inside a time window: take() says whether this try is allowed and, if not, how long to wait. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private windowMs: number, private max: number, private now: () => number = Date.now) {}

  take(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const at = this.now();
    const recent = (this.hits.get(key) || []).filter((time) => at - time < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + this.windowMs - at) / 1000)) };
    }
    recent.push(at);
    this.hits.set(key, recent);
    if (this.hits.size > MAX_TRACKED_KEYS) this.prune(at);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(at: number) {
    for (const [key, times] of Array.from(this.hits.entries())) if (!times.some((time) => at - time < this.windowMs)) this.hits.delete(key);
  }
}

/** The address of the visitor: Cloudflare names it in a header; otherwise the address Express worked out through the trusted proxies. */
export function clientAddress(req: Request): string {
  const viaCloudflare = req.headers["cf-connecting-ip"];
  return (typeof viaCloudflare === "string" && viaCloudflare) || req.ip || req.socket?.remoteAddress || "unknown";
}

const accountKey = (req: Request): string => {
  const body = (req.body || {}) as Record<string, unknown>;
  const raw = body.email ?? body.phoneNumber ?? body.phone ?? body.username ?? body.identifier ?? "";
  return String(raw).trim().toLowerCase().slice(0, 120);
};

interface LimitRule {
  name: string;
  method: "GET" | "POST";
  pattern: RegExp;
  perAddress: { windowMinutes: number; max: number };
  perAccount?: { windowMinutes: number; max: number };
}

// The address limits are generous (many staff share the venue's address, and a proxy can hide the real one); the account limits are what stops guessing a password.
const RULES: LimitRule[] = [
  { name: "login", method: "POST", pattern: /^\/api\/auth\/login\/?$/, perAddress: { windowMinutes: 10, max: 100 }, perAccount: { windowMinutes: 15, max: 10 } },
  { name: "register", method: "POST", pattern: /^\/api\/auth\/register\/?$/, perAddress: { windowMinutes: 60, max: 60 }, perAccount: { windowMinutes: 60, max: 5 } },
  { name: "forgot-password", method: "POST", pattern: /^\/api\/auth\/forgot-password\/?$/, perAddress: { windowMinutes: 60, max: 20 }, perAccount: { windowMinutes: 60, max: 5 } },
  { name: "reset-password", method: "POST", pattern: /^\/api\/auth\/reset-password\/?$/, perAddress: { windowMinutes: 60, max: 30 } },
  { name: "change-password", method: "POST", pattern: /^\/api\/auth\/change-password\/?$/, perAddress: { windowMinutes: 60, max: 30 } },
  { name: "apply-referral", method: "POST", pattern: /^\/api\/auth\/apply-referral\/?$/, perAddress: { windowMinutes: 60, max: 60 } },
  { name: "chat-login", method: "GET", pattern: /^\/api\/chat-login\/[^/]+\/?$/, perAddress: { windowMinutes: 10, max: 60 } },
];

export function applySecurityHeaders(app: Express) {
  app.disable("x-powered-by");
  app.set("trust proxy", TRUSTED_PROXIES);

  // Headers that switch off whole kinds of attack (a script hidden in an upload run as a page, the site shown inside someone else's page, a leaked address in a link).
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    if (req.secure) res.setHeader("Strict-Transport-Security", `max-age=${HSTS_MAX_AGE_SECONDS}`);
    next();
  });

}

/** Login / sign-up / password limits. Register it after the body parser: the account being tried is named in the body. */
export function applyRateLimits(app: Express) {
  if (process.env.RATE_LIMIT_OFF === "1") { console.warn("[security] RATE_LIMIT_OFF=1: login and sign-up limits are switched off (tests only)."); return; }
  const addressLimiters = new Map(RULES.map((rule) => [rule.name, new RateLimiter(rule.perAddress.windowMinutes * MS_PER_MINUTE, rule.perAddress.max)]));
  const accountLimiters = new Map(RULES.filter((rule) => rule.perAccount).map((rule) => [rule.name, new RateLimiter(rule.perAccount!.windowMinutes * MS_PER_MINUTE, rule.perAccount!.max)]));
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rule = RULES.find((r) => r.method === req.method && r.pattern.test(req.path));
    if (!rule) return next();
    const verdicts = [addressLimiters.get(rule.name)!.take(clientAddress(req))];
    const account = rule.perAccount ? accountKey(req) : "";
    if (account) verdicts.push(accountLimiters.get(rule.name)!.take(account));
    const blocked = verdicts.find((v) => !v.allowed);
    if (!blocked) return next();
    console.warn(`[security] ${rule.name} limit reached from ${clientAddress(req)}${account ? ` for ${account.replace(/(.{2}).*(@.*)?/, "$1…$2")}` : ""}`);
    res.setHeader("Retry-After", String(blocked.retryAfterSeconds));
    return res.status(429).json({ message: tr(req, { en: "Too many attempts. Please wait a few minutes and try again.", zh: "尝试次数过多，请等几分钟后再试。", id: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi." }) });
  });
}

/** Meta signs every webhook call with the app secret (X-Hub-Signature-256: sha256=<hmac of the raw body>). "unverifiable" = no app secret is known here. */
export function verifyMetaSignature(rawBody: Buffer | undefined, header: string | undefined, secret: string): "ok" | "bad" | "unverifiable" {
  if (!secret) return "unverifiable";
  if (!rawBody || !header || !header.startsWith("sha256=")) return "bad";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  return left.length === right.length && timingSafeEqual(left, right) ? "ok" : "bad";
}
